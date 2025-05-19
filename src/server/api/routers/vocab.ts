import { enrichWord, gradeSentence } from "@/lib/api/gemini";
import { calculateNextReview } from "@/lib/srs/sm2";
import {
	getNextVocabWordSchema,
	getVocabSessionSummarySchema,
	startVocabSessionSchema,
	submitVocabAnswerSchema,
} from "@/schemas/practice.schema";
import { listPracticeSessionsSchema } from "@/schemas/readingWriting.schema";
import {
	addWordsSchema,
	deleteWordSchema,
	getWordHistorySchema,
	listWordsByBankSchema,
	toggleWordStarSchema,
	updateWordNotesSchema, // Add schema import
	updateWordSchema,
	wordBankSchema,
} from "@/schemas/vocab.schema";
import type { Prisma } from "@prisma/client";
import { PracticeType, PrismaClient } from "@prisma/client"; // Import PracticeType from Prisma
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
// Removed duplicate import of rateWordReviewCountSchema

type WordWithRelations = Prisma.WordGetPayload<{
	include: {
		wordMaster: true;
		wordBank: {
			select: {
				id: true;
				userId: true;
			};
		};
		_count: {
			select: {
				practiceLogs: true;
			};
		};
	};
}>;

// Vocab Router
// Helper function for overall stats calculation
// Use PrismaClient type for the prisma instance
async function calculateOverallStats(prisma: PrismaClient, userId: string) {
	const practiceSessionsCount = await prisma.practiceSession.count({
		where: { userId: userId, type: PracticeType.VOCABULARY },
	});

	const allUserWords = await prisma.word.findMany({
		where: { wordBank: { userId: userId } },
		select: { interval: true },
	});

	const masteredWordsCount = allUserWords.filter((w: { interval: number }) => w.interval > 30).length;

	// For overall accuracy, we need practice logs
	const logs = await prisma.wordPracticeLog.findMany({
		where: { practiceSession: { userId: userId, type: PracticeType.VOCABULARY } },
		select: { isCorrect: true },
	});

	const totalLogs = logs.length;
	const correctLogs = logs.filter((log: { isCorrect: boolean | null }) => log.isCorrect).length;
	const overallAccuracy = totalLogs > 0 ? Math.round((correctLogs / totalLogs) * 100) : 0;

	return {
		practiceSessionsCount,
		masteredWordsCount,
		overallAccuracy,
		totalWordsCount: allUserWords.length, // Add total word count as well
	};
}

export async function checkWordBankAccess(prisma: PrismaClient, userId: string, wordBankId: string) {
	console.debug(`[AccessCheck] Verifying access for user ${userId} to bank ${wordBankId}`);

	// Check direct ownership
	const ownedBank = await prisma.wordBank.findUnique({
		where: { id: wordBankId, userId },
		select: { id: true },
	});
	if (ownedBank) {
		console.debug(`[AccessCheck] User ${userId} owns bank ${wordBankId}`);
		return { hasAccess: true, isOwner: true };
	}

	// Check both group sharing and direct sharing
	const sharedBank = await prisma.sharedWordBank.findFirst({
		where: {
			wordBankId,
			OR: [
				{
					sharedWithGroup: {
						members: {
							some: { userId }
						}
					}
				},
				{ sharedWithUserId: userId }
			]
		},
		select: { id: true },
	});

	if (sharedBank) {
		console.debug(`[AccessCheck] User ${userId} has shared access to bank ${wordBankId}`);
		return { hasAccess: true, isOwner: false };
	}

	console.debug(`[AccessCheck] Access denied for user ${userId} to bank ${wordBankId}`);
	return { hasAccess: false, isOwner: false };
}

export const vocabRouter = router({
	// --- Word Bank CRUD ---
	getShareLink: protectedProcedure
		.input(z.object({ wordBankId: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			// Check if user is the owner of the word bank
			const { hasAccess, isOwner } = await checkWordBankAccess(ctx.prisma, ctx.session.user.id, input.wordBankId);
			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this word bank",
				});
			}

			if (!isOwner) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the owner can generate a share link for this word bank",
				});
			}

			const sharedRecord = await ctx.prisma.sharedWordBank.findFirst({
				where: { wordBankId: input.wordBankId },
				select: { shareLink: true }
			});
			return sharedRecord?.shareLink ?? null;
		}),

	createWordBank: protectedProcedure.input(wordBankSchema).mutation(async ({ ctx, input }) => {
		console.log("Validated input received by createWordBank:", input);
		console.log("Session user:", ctx.session.user);

		if (!ctx.session.user?.id) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "User ID not found in session. Please log in again.",
			});
		}

		try {
			const newWordBank = await ctx.prisma.wordBank.create({
				data: {
					name: input.name,
					description: input.description,
					userId: ctx.session.user.id, // Directly assign userId instead of using connect
				},
			});
			return newWordBank;
		} catch (error) {
			console.error("Error creating word bank:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to create word bank.",
				cause: error,
			});
		}
	}),

	listWordBanks: protectedProcedure.query(async ({ ctx }) => {
		try {
			// Get both owned and shared word banks
			// Fetch owned word banks
			const ownedBanks = await ctx.prisma.wordBank.findMany({
				where: { userId: ctx.session.user.id },
				include: {
					words: { select: { interval: true } },
					practiceSessions: {
						orderBy: { createdAt: "desc" },
						take: 1,
						select: { createdAt: true },
					},
					// Include sharedWith relation to get group info for owned banks
					sharedWith: {
						include: {
							sharedWithGroup: {
								include: {
									members: {
										where: { userId: ctx.session.user.id },
										select: { role: true, groupId: true },
									}
								}
							}
						}
					}
				},
				orderBy: { createdAt: "desc" },
			});

			// Fetch shared word banks by querying SharedWordBank
			const sharedWordBankLinks = await ctx.prisma.sharedWordBank.findMany({
				where: {
					OR: [
						{ sharedWithUserId: ctx.session.user.id }, // Directly shared
						{
							sharedWithGroup: { // Shared via a group
								members: {
									some: { userId: ctx.session.user.id }
								}
							}
						}
					]
				},
				include: {
					wordBank: { // Include the related WordBank
						include: {
							words: { select: { interval: true } },
							practiceSessions: {
								orderBy: { createdAt: "desc" },
								take: 1,
								select: { createdAt: true },
							},
							// Include sharedWith relation to get group info for shared banks
							sharedWith: {
								include: {
									sharedWithGroup: {
										include: {
											members: {
												where: { userId: ctx.session.user.id },
												select: { role: true, groupId: true },
											}
										}
									}
								}
							}
						}
					},
					sharedWithGroup: { // Include the group info directly from SharedWordBank
						include: {
							members: {
								where: { userId: ctx.session.user.id },
								select: { role: true, groupId: true },
							}
						}
					}
				}
			});

			// Extract word banks from the shared links
			const sharedBanks = sharedWordBankLinks.map(link => link.wordBank);

			// Combine and de-duplicate banks by ID
			const seenIds = new Set<string>();
			const wordBanks = [...ownedBanks, ...sharedBanks].filter(bank => {
				if (seenIds.has(bank.id)) {
					return false;
				}
				seenIds.add(bank.id);
				return true;
			});

			// Define the expected type based on the Prisma query result structure
			// This type needs to reflect the structure of WordBank with the included relations
			type BankWithDetails = Prisma.WordBankGetPayload<{
				include: {
					words: { select: { interval: true } };
					practiceSessions: { select: { createdAt: true } };
					sharedWith: { // Use 'sharedWith' as per the schema inference
						include: {
							sharedWithGroup: {
								include: {
									members: {
										where: { userId: string }; // This where clause is in the query, not the result type
										select: { role: true, groupId: true };
									};
								};
							};
						};
					};
				};
			}>;

			// Corrected type definition for the mapped result
			type WordBankWithGroupInfo = Omit<BankWithDetails, 'words' | 'practiceSessions' | 'sharedWith'> & {
				wordCount: number;
				masteryPercentage: number;
				lastPracticedAt: Date | null;
				sharedGroups: {
					id: string;
					name: string;
					userRole: string | null; // Assuming role is a string or null
				}[];
				isShared: boolean;
			};


			const wordBanksWithDetails: WordBankWithGroupInfo[] = wordBanks.map((bank) => {
				const totalWords = bank.words.length;
				const masteredCount = bank.words.filter((word) => word.interval > 30).length;
				const masteryPercentage = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

				// Extract group information and user's role from the 'sharedWith' relation
				const sharedGroups = bank.sharedWith
					.map(swb => swb.sharedWithGroup)
					.filter(group => group !== null) // Filter out null groups if any
					.map(group => ({
						id: group.id,
						name: group.name,
						userRole: group.members[0]?.role ?? null, // Get the role of the current user
					}));

				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { words, practiceSessions, sharedWith, ...bankWithoutRelations } = bank;

				return {
					...bankWithoutRelations,
					wordCount: totalWords,
					masteryPercentage: masteryPercentage,
					lastPracticedAt: practiceSessions[0]?.createdAt ?? null,
					sharedGroups: sharedGroups, // Include shared group information
					isShared: sharedGroups.length > 0, // A bank is shared if it has any shared groups
				};
			});
			return wordBanksWithDetails;
		} catch (error) {
			console.error("Error listing word banks:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to retrieve word banks.",
				cause: error,
			});
		}
	}),

	// --- Overall Stats ---
	getOverallStats: protectedProcedure.query(async ({ ctx }) => {
		try {
			return await calculateOverallStats(ctx.prisma, ctx.session.user.id);
		} catch (error) {
			console.error("Error fetching overall stats:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to retrieve overall statistics.",
				cause: error,
			});
		}
	}),

	getById: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
		const { hasAccess } = await checkWordBankAccess(ctx.prisma, ctx.session.user.id, input.id);
		if (!hasAccess) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Word bank not found or access denied.",
			});
		}

		const wordBank = await ctx.prisma.wordBank.findUnique({
			where: { id: input.id },
			include: {
				_count: {
					select: { words: true },
				},
				words: {
					select: {
						notes: true,
					},
				},
			},
		});

		const noteCount = wordBank?.words.filter((w: { notes: string | null }) => w.notes).length ?? 0;
		return {
			...wordBank,
			noteCount,
		};
	}),

	// Procedure to get a single word by ID (NEW)
	getWordById: protectedProcedure.input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
		const word = await ctx.prisma.word.findUnique({
			where: { id: input.id },
			include: {
				wordMaster: true,
				wordBank: { select: { id: true } },
			},
		});

		if (!word) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Word not found.",
			});
		}

		const { hasAccess } = await checkWordBankAccess(ctx.prisma, ctx.session.user.id, word.wordBank.id);
		if (!hasAccess) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Word not found or access denied.",
			});
		}

		return word;
	}),

	update: protectedProcedure
		.input(wordBankSchema.extend({ id: z.string().cuid() }))
		.mutation(async ({ ctx, input }) => {
			const { id, ...dataToUpdate } = input;
			try {
				const updatedWordBank = await ctx.prisma.wordBank.update({
					where: { id: id, userId: ctx.session.user.id },
					data: dataToUpdate,
				});
				return updatedWordBank;
			} catch (error) {
				if (error instanceof Error && 'code' in error && error.code === "P2025") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Word bank not found or you do not have permission to edit it.",
					});
				}
				console.error("Error updating word bank:", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update word bank.",
					cause: error,
				});
			}
		}),

	// --- Word CRUD ---
	listByBank: protectedProcedure.input(listWordsByBankSchema).query(async ({ ctx, input }) => {
		const { hasAccess } = await checkWordBankAccess(ctx.prisma, ctx.session.user.id, input.wordBankId);
		if (!hasAccess) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Word bank not found or access denied.",
			});
		}

		const words = await ctx.prisma.word.findMany({
			where: { wordBankId: input.wordBankId },
			select: {
				id: true,
				text: true,
				interval: true,
				easeFactor: true,
				repetitions: true,
				nextReviewDate: true,
				isStarred: true,
				notes: true,
				mastery: true, // Add mastery
				nextDueAtReviewCount: true, // Add nextDueAtReviewCount
				timesSeen: true, // Add timesSeen
				successRate: true, // Add successRate
				wordMasterId: true,
				wordMaster: {
					select: {
						id: true,
						baseWord: true,
						wordType: true,
						definition: true,
						sampleSentences: true,
						translations: true,
						isDictionaryWord: true,
					},
				},
				wordBank: {
					select: {
						id: true,
					},
				},
				_count: {
					select: { practiceLogs: true },
				},
			},
			orderBy: { id: "asc" }, // Order by Word ID
		});

		// Transform the result (removed redundant assignments for fields now directly selected)

		return words.map((word) => ({
			...word,
			wordBankId: word.wordBank.id,
			practiceCount: word._count?.practiceLogs ?? 0,
		}));
	}),

	updateWord: protectedProcedure.input(updateWordSchema).mutation(async ({ ctx, input }) => {
		const { wordId, text, wordMasterId } = input;
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: { wordBank: { select: { userId: true } } },
		});
		if (!word || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
		}

		const updateData: any = {};
		if (text) updateData.text = text;
		if (wordMasterId) {
			updateData.wordMaster = { connect: { id: wordMasterId } };
		}

		const updatedWord = await ctx.prisma.word.update({
			where: { id: wordId },
			data: updateData,
			// Include the wordMaster relation in the returned object
			include: { wordMaster: true },
		});
		return updatedWord;
	}),

	// Procedure to update word notes (NEW)
	updateWordNotes: protectedProcedure.input(updateWordNotesSchema).mutation(async ({ ctx, input }) => {
		const { wordId, notes } = input;
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: { wordBank: { select: { userId: true } } },
		});
		if (!word || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to update notes for this word." });
		}

		const updatedWord = await ctx.prisma.word.update({
			where: { id: wordId },
			data: { notes },
			select: { id: true, notes: true }, // Return only necessary fields
		});
		return updatedWord;
	}),

	deleteWord: protectedProcedure.input(deleteWordSchema).mutation(async ({ ctx, input }) => {
		const { wordId } = input;
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: { wordBank: { select: { userId: true } } },
		});
		if (!word || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
		}
		await ctx.prisma.word.delete({ where: { id: wordId } });
		return { success: true, wordId };
	}),

	toggleStar: protectedProcedure.input(toggleWordStarSchema).mutation(async ({ ctx, input }) => {
		const { wordId, isStarred } = input;
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: { wordBank: { select: { userId: true } } },
		});
		if (!word || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to star this word." });
		}

		const updatedWord = await ctx.prisma.word.update({
			where: { id: wordId },
			data: { isStarred },
			select: { id: true, isStarred: true }, // Return only necessary fields
		});
		return updatedWord;
	}),

	// Removed redundant rateWordReviewCount mutation as SRS update is handled in submitVocabAnswer.
	// If this mutation was intended for a different purpose, it needs to be re-evaluated.
	// rateWordReviewCount: protectedProcedure
	// 	.input(rateWordReviewCountSchema)
	// 	.mutation(async ({ ctx, input }) => {
	// 		// ... (removed content)
	// 	}),

	// Procedure to add words to a word bank (NEW)
	addBatch: protectedProcedure.input(addWordsSchema).mutation(async ({ ctx, input }) => {
		const { wordBankId, words } = input;

		// Check if user has access to the word bank
		const { hasAccess, isOwner } = await checkWordBankAccess(ctx.prisma, ctx.session.user.id, wordBankId);

		if (!hasAccess) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have permission to add words to this word bank.",
			});
		}

		// Only owner can add words (or define different permission logic)
		if (!isOwner) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only the owner of this word bank can add words.",
			});
		}

		const wordRecords = await Promise.all(
			words.map(async (wordText: string) => {
				// Check if wordMaster already exists for this base word
				let wordMaster = await ctx.prisma.wordMaster.findFirst({
					where: { baseWord: wordText.toLowerCase() },
				});

				let enrichedData = null;
				if (!wordMaster) {
					// If wordMaster doesn't exist, enrich the word using AI
					enrichedData = await enrichWord(wordText); // Assuming enrichWord returns definition, sentence, etc.

					// Create new wordMaster record
					wordMaster = await ctx.prisma.wordMaster.create({
						data: {
							baseWord: wordText.toLowerCase(),
							variations: [wordText], // Add the original word as a variation
							wordType: enrichedData?.wordType,
							definition: enrichedData?.definition,
							sampleSentences: enrichedData?.sampleSentence // Use singular sampleSentence
								? [enrichedData.sampleSentence] // Store as an array
								: [],
							translations: enrichedData?.translation
								? { default: enrichedData.translation }
								: {}, // Store translations as JSON
							isDictionaryWord: enrichedData !== null, // Mark as dictionary word if enrichment was successful
							language: 'en', // Add required language field (defaulting to English)
						},
					});
				} else {
					// If wordMaster exists, check if the current wordText is already a variation
					if (Array.isArray(wordMaster.variations) && !wordMaster.variations.includes(wordText)) { // Check if variations is array
						// Add new variation if it doesn't exist
						wordMaster = await ctx.prisma.wordMaster.update({
							where: { id: wordMaster.id },
							data: {
								variations: {
									push: wordText,
								},
							},
						});
					}
				}

				// Check if the word already exists in the word bank
				const existingWord = await ctx.prisma.word.findFirst({ // Use findFirst as we are not using a unique key
					where: {
						wordBankId: wordBankId,
						text: wordText,
					},
				});

				if (existingWord) {
					console.warn(`Word "${wordText}" already exists in word bank "${wordBankId}". Skipping.`);
					return null; // Skip adding if word already exists
				}

				// Create new word record linked to the wordMaster and wordBank
				return {
					wordBankId: wordBankId,
					text: wordText,
					wordMasterId: wordMaster.id,
					// Initialize SRS fields
					interval: 1,
					easeFactor: 2.5,
					repetitions: 0,
					nextReviewDate: new Date(),
					mastery: 0, // Initial mastery level
					nextDueAtReviewCount: 1, // Initial next due review count
					timesSeen: 0, // Initial times seen
					successRate: 0, // Initial success rate
				};
			})
		);

		// Filter out null values (for words that already existed)
		const validWordRecords = wordRecords.filter(record => record !== null) as {
			wordBankId: string;
			text: string;
			wordMasterId: string;
			interval: number;
			easeFactor: number;
			repetitions: number;
			nextReviewDate: Date;
			mastery: number;
			nextDueAtReviewCount: number;
			timesSeen: number;
			successRate: number;
		}[];


		if (validWordRecords.length === 0) {
			return { count: 0 }; // No new words added
		}

		// Create words in a batch
		const createResult = await ctx.prisma.word.createMany({
			data: validWordRecords,
			skipDuplicates: true, // Ensure no duplicates are created
		});

		return { count: createResult.count };
	}),

	// --- Practice Sessions ---
	startVocabSession: protectedProcedure.input(startVocabSessionSchema).mutation(async ({ ctx, input }) => {
		const { wordBankId, practiceType, numberOfWords } = input;

		// Check if user has access to the word bank
		const { hasAccess } = await checkWordBankAccess(ctx.prisma, ctx.session.user.id, wordBankId);

		if (!hasAccess) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have permission to start a practice session for this word bank.",
			});
		}

		// Fetch words for the session based on SRS and user preferences
		// This logic should select words that are due for review or new words
		const wordsForSession = await ctx.prisma.word.findMany({
			where: {
				wordBankId: wordBankId,
				// Example filtering logic (needs refinement based on actual SRS strategy)
				OR: [
					{ nextReviewDate: { lte: new Date() } }, // Due for review
					{ repetitions: 0 }, // New words
				],
			},
			orderBy: [
				{ nextReviewDate: "asc" }, // Prioritize words due sooner
				{ createdAt: "asc" }, // Then by creation date
			],
			take: numberOfWords, // Limit to the requested number of words
			include: {
				wordMaster: true, // Include wordMaster details
			},
		});

		if (wordsForSession.length === 0) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "No words available for practice in this word bank.",
			});
		}

		// Create a new practice session
		const newSession = await ctx.prisma.practiceSession.create({
			data: {
				userId: ctx.session.user.id,
				type: practiceType, // Use the imported PracticeType
				// Link words to the session (implicitly via WordPracticeLog later)
			},
		});

		// Return the session ID and the words for the session
		return {
			sessionId: newSession.id,
			words: wordsForSession.map(word => ({
				id: word.id,
				text: word.text,
				wordMaster: word.wordMaster, // Include wordMaster details
				// Include other necessary word details for the practice session
				interval: word.interval,
				easeFactor: word.easeFactor,
				repetitions: word.repetitions,
				nextReviewDate: word.nextReviewDate,
				mastery: word.mastery,
				nextDueAtReviewCount: word.nextDueAtReviewCount,
				timesSeen: word.timesSeen,
				successRate: word.successRate,
			})),
		};
	}),

	startQuickVocabSession: protectedProcedure.input(z.void()).mutation(async ({ ctx }) => {
		// Logic to start a quick session across all owned word banks
		// This would involve selecting a few words from each bank or a combined pool
		// For simplicity, let's just return a placeholder for now.
		console.warn("startQuickVocabSession not fully implemented.");
		return { sessionId: "quick_session_placeholder", words: [] };
	}),

	getNextVocabWord: protectedProcedure.input(getNextVocabWordSchema).query(async ({ ctx, input }) => {
		const { practiceSessionId } = input;
		const userId = ctx.session.user.id;

		const session = await ctx.prisma.practiceSession.findUnique({
			where: { id: practiceSessionId, userId: userId },
			// Select wordBankId to know which bank we are practicing
			select: { wordBankId: true },
		});
		if (!session) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Practice session not found." });
		}

		// Get IDs of words already practiced in this session
		const practicedWordIds = (
			await ctx.prisma.wordPracticeLog.findMany({
				where: { practiceSessionId },
				select: { wordId: true },
			})
		).map((log: { wordId: string }) => log.wordId);

		let wordBankReviewCount: number | null = null;
		const whereClause: Prisma.WordWhereInput = {
			// Use Prisma type for better safety
			id: { notIn: practicedWordIds },
		};

		// Determine the review count and filter by bank if applicable
		if (session.wordBankId) {
			const wordBank = await ctx.prisma.wordBank.findUnique({
				where: { id: session.wordBankId },
				select: { id: true }, // Removed reviewCount
			});
			if (!wordBank) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word bank for session not found." });
			}
			// Removed wordBankReviewCount as reviewCount is not on WordBank model.
			whereClause.wordBankId = session.wordBankId; // Filter words for this specific bank
		} else {
			// --- Handling for "Quick Practice" (no specific bank) ---
			// Option 1: Fallback to date-based SRS (simpler)
			whereClause.nextReviewDate = { lte: new Date() };
			whereClause.wordBank = { userId: userId }; // Still limit to user's words
	
			// Option 2: Complex logic to find a word due in *any* bank based on its reviewCount
			// This would likely require a more complex query or multiple queries.
			// For now, using Option 1 (date-based fallback) for simplicity.
			console.log("Quick Practice session: Falling back to date-based review for selecting next word.");
		}
	
		// Removed review count condition as wordBankReviewCount is not used.
		// if (wordBankReviewCount !== null) {
		// 	whereClause.nextDueAtReviewCount = { lte: wordBankReviewCount };
		// }
	
		const nextWord = await ctx.prisma.word.findFirst({
			where: whereClause,
			// Prioritize by date
			orderBy: { nextReviewDate: "asc" },
			include: { wordMaster: true }, // Include wordMaster for display
		});
	
		return nextWord; // Return the found word or null
	}),

	submitVocabAnswer: protectedProcedure.input(submitVocabAnswerSchema).mutation(async ({ ctx, input }) => {
		const { practiceSessionId, wordId, userSentence, easeChosen } = input;
		const userId = ctx.session.user.id;

		try {
			const word = await ctx.prisma.word.findUnique({
				where: { id: wordId },
				select: {
					id: true,
					text: true,
					interval: true,
					easeFactor: true, // Corrected typo
					repetitions: true,
					nextReviewDate: true,
					mastery: true,
					wordBankId: true, // Select wordBankId
					wordBank: { select: { userId: true } },
					isStarred: true, // Add isStarred
					successRate: true, // Add successRate
					wordMaster: { // Include wordMaster
						select: {
							sampleSentences: true, // Include sampleSentences
						},
					},
				},
			});

			if (!word || word.wordBank.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Word not found or access denied.",
				});
			}

			// Grade the user's sentence using AI
			const gradingResult = await gradeSentence(word.text, userSentence);

			if (!gradingResult) {
				// Handle AI grading failure
				console.error(`AI grading failed for word "${word.text}" and sentence "${userSentence}"`);
				// Decide how to proceed: mark as incorrect, skip SRS update, etc.
				// For now, let's throw an error or return a specific status.
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to grade sentence using AI.",
				});
			}

			const { isCorrect, feedback } = gradingResult;

			// Calculate next review date and SRS parameters using SM-2 algorithm
			// The quality rating for SM-2 is typically 0-5.
			// Map the user's mastery rating (0-4) to SM-2 quality (0-5).
			// A simple mapping could be mastery + 1, or a more nuanced one.
			// Let's use mastery + 1 for now (0->1, 1->2, 2->3, 3->4, 4->5).
			const sm2Quality = easeChosen + 1; // Use easeChosen for SM-2 quality

			const { nextReviewDate, interval: newInterval, repetitions: newRepetitions, easeFactor: newEaseFactor } = calculateNextReview(
				{ // Pass word SRS data as an object
					interval: word.interval,
					repetitions: word.repetitions,
					easeFactor: word.easeFactor,
					isStarred: word.isStarred, // Include isStarred
					sampleSentence: word.wordMaster?.sampleSentences?.[0] ?? null, // Include sampleSentence (singular)
					successRate: word.successRate, // Include successRate
				},
				easeChosen // Pass easeChosen (0-4)
			);

			// Calculate nextDueAtReviewCount based on the word's updated interval
			// This assumes nextDueAtReviewCount is related to the word's individual progress, not the bank's total reviews.
			// If it's intended to be based on the bank's review count, the schema must be updated.
			// For now, setting it based on the new interval as a plausible interpretation.
			const nextDueAtReviewCount = newInterval; // Using newInterval as a placeholder logic


			// Update the word in the database
			const updatedWord = await ctx.prisma.word.update({
				where: { id: wordId },
				data: {
					interval: newInterval,
					repetitions: newRepetitions,
					easeFactor: newEaseFactor,
					nextReviewDate: nextReviewDate,
					mastery: easeChosen, // Store the user's mastery rating (0-4)
					nextDueAtReviewCount: nextDueAtReviewCount, // Update next due review count
					timesSeen: { increment: 1 }, // Increment times seen
					successRate: { // Calculate new success rate
						increment: isCorrect ? 1 : 0, // Increment correct count based on AI grading
					},
				},
				select: {
					id: true,
					interval: true,
					repetitions: true,
					easeFactor: true,
					nextReviewDate: true,
					mastery: true,
					nextDueAtReviewCount: true,
					timesSeen: true,
					successRate: true,
				},
			});

			// Removed word bank review count update as reviewCount is not on WordBank model.
			// If tracking total reviews per bank is needed, the schema must be updated.


			// Create a practice log entry
			const practiceLog = await ctx.prisma.wordPracticeLog.create({
				data: {
					wordId: wordId,
					practiceSessionId: practiceSessionId, // Use practiceSessionId from input
					userSentences: [userSentence], // Assign as an array of strings
					isCorrect: isCorrect,
					aiFeedback: feedback,
					easeChosen: easeChosen, // Store the user's chosen mastery (0-4)
				},
			});

			return {
				updatedWord,
				practiceLog,
				isCorrect,
				feedback,
			};
		} catch (error) {
			console.error("Error submitting vocab answer:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to submit vocabulary answer.",
				cause: error,
			});
		}
	}),

	getVocabSessionSummary: protectedProcedure.input(getVocabSessionSummarySchema).query(async ({ ctx, input }) => {
		const { sessionId } = input;

		const session = await ctx.prisma.practiceSession.findUnique({
			where: { id: sessionId, userId: ctx.session.user.id, type: PracticeType.VOCABULARY },
			include: {
				vocabLogs: {
					include: {
						word: {
							select: {
								id: true,
								text: true,
								wordMaster: true, // Include wordMaster details
							},
						},
					},
				},
			},
		});

		if (!session) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Practice session not found or access denied.",
			});
		}

		const totalAttempts = session.vocabLogs.length;
		const correctAttempts = session.vocabLogs.filter(log => log.isCorrect).length;
		const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

		// Group logs by word to show summary per word
		const wordSummaries = session.vocabLogs.reduce((acc, log) => {
			if (!acc[log.wordId]) {
				acc[log.wordId] = {
					word: log.word,
					attempts: [],
					correctCount: 0,
				};
			}
			acc[log.wordId].attempts.push(log);
			if (log.isCorrect) {
				acc[log.wordId].correctCount++;
			}
			return acc;
		}, {} as Record<string, { word: typeof session.vocabLogs[0]['word'], attempts: typeof session.vocabLogs, correctCount: number }>);

		return {
			sessionId: session.id,
			startTime: session.startTime,
			endTime: session.endTime, // This might be null if session is ongoing
			totalAttempts,
			correctAttempts,
			accuracy,
			wordSummaries: Object.values(wordSummaries),
		};
	}),

	listPracticeSessions: protectedProcedure
		.input(z.object({
			limit: z.number().min(1).max(100).default(10),
			cursor: z.string().cuid().nullable().optional(),
			direction: z.enum(["forward", "backward"]).default("forward"),
		}))
		.query(async ({ ctx, input }) => {
			const { limit, cursor, direction } = input;

			const sessions = await ctx.prisma.practiceSession.findMany({
				where: { userId: ctx.session.user.id, type: PracticeType.VOCABULARY },
				take: direction === "forward" ? limit + 1 : -limit - 1, // Fetch one extra for cursor
				cursor: cursor ? { id: cursor } : undefined,
				orderBy: { createdAt: "desc" },
				include: {
					_count: {
						select: { vocabLogs: true },
					},
				},
			});

			let nextCursor: typeof cursor | undefined = undefined;
			let prevCursor: typeof cursor | undefined = undefined;
			const items = direction === "forward" ? sessions.slice(0, limit) : sessions.slice(sessions.length - limit);

			if (direction === "forward" && sessions.length > limit) {
				nextCursor = sessions[limit].id;
			} else if (direction === "backward" && sessions.length > limit) {
				prevCursor = sessions[0].id;
			}

			// Map the results to include the practice count
			type SessionWithRelations = Prisma.PracticeSessionGetPayload<{
				include: {
					_count: {
						select: { vocabLogs: true };
					};
				};
			}>;

			const sessionsWithCount = items.map((s: SessionWithRelations) => ({
				...s,
				practiceCount: s._count.vocabLogs,
			}));


			return {
				items: sessionsWithCount,
				nextCursor,
				prevCursor,
			};
		}),

	getWordPracticeHistory: protectedProcedure.input(getWordHistorySchema).query(async ({ ctx, input }) => {
		const { wordId } = input;

		// Verify user has access to the word's word bank
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: { wordBank: { select: { userId: true } } },
		});

		if (!word || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Word not found or access denied.",
			});
		}

		const practiceLogs = await ctx.prisma.wordPracticeLog.findMany({
			where: { wordId: wordId },
			orderBy: { timestamp: "desc" },
			include: {
				practiceSession: {
					select: { startTime: true, type: true },
				},
			},
		});

		return practiceLogs;
	}),

	// Procedure to get words due for review (NEW)
	getWordsDueForReview: protectedProcedure.query(async ({ ctx }) => {
		const wordsDue = await ctx.prisma.word.findMany({
			where: {
				wordBank: { userId: ctx.session.user.id }, // Only owned word banks for now
				nextReviewDate: { lte: new Date() },
			},
			select: {
				id: true,
				text: true,
				nextReviewDate: true,
				interval: true,
				wordBankId: true,
			},
			orderBy: { nextReviewDate: "asc" },
		});
		return wordsDue;
	}),

	// Procedure to get a hint for a word during practice (NEW)
	getWordHint: protectedProcedure.input(z.object({ wordId: z.string().cuid() })).query(async ({ ctx, input }) => {
		const { wordId } = input;

		// Verify user has access to the word's word bank
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: {
				text: true, // Add text to select
				wordBank: { select: { userId: true } },
				wordMaster: {
					select: {
						id: true, // Add id to select
						baseWord: true, // Add baseWord to select
						wordType: true,
						definition: true,
						sampleSentences: true,
						translations: true,
					},
				},
			},
		});

		if (!word || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Word not found or access denied.",
			});
		}

		const wordMaster = word.wordMaster;

		if (!wordMaster) {
			return { hint: "No hint available for this word." };
		}

		// Construct a hint based on available wordMaster data
		let hint = "";
		const missingFields: string[] = [];

		if (wordMaster.definition) {
			hint += `Definition: ${wordMaster.definition}\n`;
		} else {
			missingFields.push("definition");
		}

		// Use the first sample sentence if available
		if (wordMaster.sampleSentences && wordMaster.sampleSentences.length > 0) {
			hint += `Sample Sentence: ${wordMaster.sampleSentences[0]}\n`;
		} else {
			missingFields.push("sampleSentence");
		}

		// Use the default translation if available (safely access)
		const defaultTranslation = (wordMaster.translations as any)?.default; // Cast to any for safe access
		if (defaultTranslation) {
			hint += `Translation: ${defaultTranslation}\n`;
		} else {
			missingFields.push("translation");
		}

		if (wordMaster.wordType) {
			hint += `Word Type: ${wordMaster.wordType}\n`;
		} else {
			missingFields.push("wordType");
		}

		if (hint === "") {
			hint = "No hint data available for this word.";
		} else if (missingFields.length > 0) {
			// If some fields were missing, try to enrich the word using AI
			console.warn(`Missing fields for word hint (${word.wordMaster?.baseWord ?? word.text}): ${missingFields.join(", ")}. Attempting enrichment.`); // Use baseWord or text for logging
			const enrichedData = await enrichWord(word.wordMaster?.baseWord ?? word.text, ctx.session.user.languagePreference ?? 'en'); // Use baseWord or text for enrichment

			if (enrichedData) {
				let enrichmentHint = "\n-- AI Enrichment --\n";
				let enrichedCount = 0;

				if (missingFields.includes("definition") && enrichedData.definition) {
					enrichmentHint += `Definition: ${enrichedData.definition}\n`;
					enrichedCount++;
				}
				if (missingFields.includes("sampleSentence") && enrichedData.sampleSentence) { // Use singular sampleSentence
					enrichmentHint += `Sample Sentence: ${enrichedData.sampleSentence}\n`; // Use singular sampleSentence
					enrichedCount++;
				}
				if (missingFields.includes("translation") && enrichedData.translation) {
					enrichmentHint += `Translation: ${enrichedData.translation}\n`;
					enrichedCount++;
				}
				if (missingFields.includes("wordType") && enrichedData.wordType) {
					enrichmentHint += `Word Type: ${enrichedData.wordType}\n`;
					enrichedCount++;
				}

				if (enrichedCount > 0) {
					hint += enrichmentHint;
					// Optionally update the wordMaster with the new data here
					// This would require a mutation or a separate service function
				} else {
					hint += "\n-- AI Enrichment Failed --\nCould not enrich word data.";
				}
			} else {
				hint += "\n-- AI Enrichment Failed --\nCould not enrich word data.";
			}
		}


		return { hint };
	}),
});

// Define a minimal type matching what calculateNextReview actually needs
interface WordSrsForCalculation {
	interval: number;
	easeFactor: number;
	repetitions: number;
	isStarred: boolean;
}
