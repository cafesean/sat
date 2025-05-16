import { enrichWord, gradeSentence } from "@/lib/api/gemini";
import { calculateNextReview } from "@/lib/srs/sm2";
import {
	getNextVocabWordSchema,
	getVocabSessionSummarySchema,
	startVocabSessionSchema,
	submitVocabAnswerSchema
} from "@/schemas/practice.schema";
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
			// Get both owned and shared word banks in a single query
			const wordBanks = await ctx.prisma.wordBank.findMany({
				where: {
					OR: [
						{ userId: ctx.session.user.id }, // Owned banks
						{
							sharedWith: { // Relation from WordBank to SharedWordBank
								some: {
									OR: [
										{ sharedWithUserId: ctx.session.user.id }, // Directly shared with user
										{
											sharedWithGroup: { // Shared with a group
												members: { // Group has members
													some: { userId: ctx.session.user.id } // User is a member of that group
												}
											}
										}
									]
								}
							}
						}
					]
				},
				include: {
					words: { select: { interval: true } },
					practiceSessions: {
						orderBy: { createdAt: "desc" },
						take: 1,
						select: { createdAt: true },
					},
					sharedWith: { // Include the SharedWordBank records linked to this WordBank
						include: {
							sharedWithGroup: { // Include the Group if shared with a group
								include: {
									members: true // Include all members of the group
								}
							},
							sharedBy: { // Include who shared it
								select: { id: true, name: true }
							},
							sharedWithUser: { // Include who it was shared with directly
								select: { id: true, name: true }
							}
						}
					}
				},
				orderBy: { createdAt: "desc" },
			});

			// Define the expected type based on the Prisma query result structure
			// This type needs to reflect the structure of WordBank with the included relations
			type BankWithDetails = Prisma.WordBankGetPayload<{
				include: {
					words: { select: { interval: true } };
					practiceSessions: { select: { createdAt: true } };
					sharedWith: {
						include: {
							sharedWithGroup: {
								include: {
									members: true; // Include all members
								};
							};
							sharedBy: { select: { id: true, name: true } };
							sharedWithUser: { select: { id: true, name: true } };
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

				// Extract group information and user's role
				const sharedGroups = bank.sharedWith
					.filter(sw => sw.sharedWithGroupId !== null && sw.sharedWithGroup !== null) // Filter for group shares
					.map(sw => sw.sharedWithGroup!) // Non-null assertion after filtering
					.map(group => {
						const currentUserMembership = group.members.find(member => member.userId === ctx.session.user.id);
						return {
							id: group.id,
							name: group.name,
							userRole: currentUserMembership?.role ?? null, // Get the role of the current user
						};
					});

				// Determine if the bank is shared with the current user (either directly or via a group)
				const isShared = bank.sharedWith.some(sw =>
					sw.sharedWithUserId === ctx.session.user.id ||
					(sw.sharedWithGroupId !== null && sw.sharedWithGroup?.members.some(member => member.userId === ctx.session.user.id))
				);


				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { words, practiceSessions, sharedWith, ...bankWithoutRelations } = bank;

				return {
					...bankWithoutRelations,
					wordCount: totalWords,
					masteryPercentage: masteryPercentage,
					lastPracticedAt: practiceSessions[0]?.createdAt ?? null,
					sharedGroups: sharedGroups, // Include shared group information
					isShared: isShared, // Indicate if the bank is shared with the current user
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
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
		}

		const updatedWord = await ctx.prisma.word.update({
			where: { id: wordId },
			data: { notes },
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

		const deletedWord = await ctx.prisma.word.delete({
			where: { id: wordId },
		});
		return deletedWord;
	}),

	toggleStar: protectedProcedure.input(toggleWordStarSchema).mutation(async ({ ctx, input }) => {
		const { wordId } = input;
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: { wordBank: { select: { userId: true } }, isStarred: true },
		});
		if (!word || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
		}

		const updatedWord = await ctx.prisma.word.update({
			where: { id: wordId },
			data: { isStarred: !word.isStarred },
		});
		return updatedWord;
	}),

	// --- Batch Word Operations ---
	// Add multiple words to a word bank
	addBatch: protectedProcedure.input(addWordsSchema).mutation(async ({ ctx, input }) => {
		const { wordBankId, words, languagePreference } = input;

		// Check if user owns the word bank
		const wordBank = await ctx.prisma.wordBank.findUnique({
			where: { id: wordBankId, userId: ctx.session.user.id },
			select: { id: true },
		});

		if (!wordBank) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Word bank not found or you do not have permission to add words to it.",
			});
		}

		// Process words: find existing WordMaster records or create new ones
		const wordMasterPromises = words.map(async (wordText: string) => {
			// Check if a WordMaster record already exists for this word (case-insensitive)
			const existingWordMaster = await ctx.prisma.wordMaster.findFirst({
				where: { baseWord: { equals: wordText, mode: 'insensitive' } },
			});

			if (existingWordMaster) {
				return existingWordMaster;
			} else {
				// If not, create a new WordMaster record and enrich it
				const newWordMaster = await ctx.prisma.wordMaster.create({
					data: {
						baseWord: wordText,
						isDictionaryWord: false, // Assume not a dictionary word initially
						variations: {}, // Add required field with default empty object
						language: languagePreference ?? ctx.session.user.languagePreference ?? 'en', // Use provided preference or user's default
						translations: {}, // Add required field with default empty object
					},
				});

				// Asynchronously enrich the word (don't block the main mutation)
				// The enrichWord function in gemini.ts is a placeholder and doesn't take prisma.
				// It should ideally update the WordMaster record after creation.
				// For now, call the placeholder with correct parameters.
				enrichWord(wordText, languagePreference ?? ctx.session.user.languagePreference ?? 'en').catch(console.error);

				return newWordMaster;
			}
		});

		const wordMasters = await Promise.all(wordMasterPromises);

		// Create Word records linking to the WordBank and WordMaster
		const wordRecords = wordMasters.map((wordMaster) => ({
			wordBankId: wordBankId,
			text: wordMaster.baseWord, // Use the baseWord from WordMaster
			wordMasterId: wordMaster.id,
			// Default SRS fields will be set by Prisma
		}));

		// Use createMany for efficiency
		const result = await ctx.prisma.word.createMany({
			data: wordRecords,
			skipDuplicates: true, // Skip if a word with the same text already exists in this bank
		});

		return { count: result.count };
	}),

	// --- Practice Sessions ---
	startVocabSession: protectedProcedure.input(startVocabSessionSchema).mutation(async ({ ctx, input }) => {
		const { wordBankId } = input;

		// Check if user has access to the word bank
		const { hasAccess } = await checkWordBankAccess(ctx.prisma, ctx.session.user.id, wordBankId);
		if (!hasAccess) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Word bank not found or access denied.",
			});
		}

		// Create a new practice session
		const newSession = await ctx.prisma.practiceSession.create({
			data: {
				userId: ctx.session.user.id,
				type: PracticeType.VOCABULARY,
				wordBankId: wordBankId, // Link the session to the word bank
				startTime: new Date(),
			},
		});

		return newSession;
	}),

	startQuickVocabSession: protectedProcedure.input(z.void()).mutation(async ({ ctx }) => {
		// Find a random word bank owned by the user
		const userWordBanks = await ctx.prisma.wordBank.findMany({
			where: { userId: ctx.session.user.id },
			select: { id: true },
		});

		if (userWordBanks.length === 0) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "No word banks found for the user.",
			});
		}

		const randomBank = userWordBanks[Math.floor(Math.random() * userWordBanks.length)];

		// Create a new practice session linked to the random word bank
		const newSession = await ctx.prisma.practiceSession.create({
			data: {
				userId: ctx.session.user.id,
				type: PracticeType.VOCABULARY,
				wordBankId: randomBank.id, // Link the session to the random word bank
				startTime: new Date(),
			},
		});

		return newSession;
	}),


	getNextVocabWord: protectedProcedure.input(getNextVocabWordSchema).query(async ({ ctx, input }) => {
		const { practiceSessionId } = input;

		// Find the current session and its associated word bank
		const session = await ctx.prisma.practiceSession.findUnique({
			where: { id: practiceSessionId },
			include: {
				wordBank: {
					include: {
						words: {
							where: {
								// Filter words based on SRS criteria (e.g., nextReviewDate <= now)
								// and not already practiced in this session
								nextReviewDate: { lte: new Date() },
								practiceLogs: {
									none: { practiceSessionId: practiceSessionId }
								}
							},
							include: {
								wordMaster: true, // Include wordMaster details
							},
						},
					},
				},
			},
		});

		if (!session || session.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Practice session not found or access denied." });
		}

		if (!session.wordBank) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found for this session." });
		}

		const wordsDueForReview = session.wordBank.words;

		if (wordsDueForReview.length === 0) {
			// No words due for review in this bank for this session
			return null;
		}

		// Select the next word based on SRS logic (e.g., lowest interval, highest priority)
		// For now, a simple approach: pick the first word due for review
		const nextWord = wordsDueForReview[0];

		return nextWord;
	}),

	submitVocabAnswer: protectedProcedure.input(submitVocabAnswerSchema).mutation(async ({ ctx, input }) => {
		const { practiceSessionId, wordId, userSentence, easeChosen } = input;

		// Find the session and word
		const session = await ctx.prisma.practiceSession.findUnique({
			where: { id: practiceSessionId },
			select: { userId: true, wordBankId: true }, // Select only necessary fields
		});

		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: {
				id: true,
				text: true,
				interval: true,
				easeFactor: true,
				repetitions: true,
				nextReviewDate: true,
				isStarred: true, // Include isStarred for SRS calculation
				wordBankId: true, // Include wordBankId for access check
				// Include fields required by WordSrsData
				successRate: true,
				wordMaster: { select: { sampleSentences: true } }, // Include sample sentences
			},
		});

		if (!session || session.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Practice session not found or access denied." });
		}

		if (!word || session.wordBankId !== word.wordBankId) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found in this session's word bank." });
		}

		// Grade the user's sentence using AI
		const aiGradingResult = await gradeSentence(word.text, userSentence);

		// Prepare data for calculateNextReview, mapping sampleSentences array to singular sampleSentence
		const wordSrsData = {
			...word,
			sampleSentence: word.wordMaster?.sampleSentences?.[0] ?? null, // Take the first sentence or null
		};
		const srsResult = calculateNextReview(wordSrsData, easeChosen);

		// Update the word's SRS fields
		await ctx.prisma.word.update({
			where: { id: wordId },
			data: {
				interval: srsResult.interval,
				easeFactor: srsResult.easeFactor,
				repetitions: srsResult.repetitions,
				nextReviewDate: srsResult.nextReviewDate,
			},
		});

		// Log the practice attempt
		const practiceLog = await ctx.prisma.wordPracticeLog.create({
			data: {
				wordId: wordId,
				practiceSessionId: practiceSessionId,
				userSentences: [userSentence], // Use userSentences (plural) and wrap in an array
				isCorrect: aiGradingResult?.isCorrect ?? false, // Handle potential null from AI grading
				aiFeedback: aiGradingResult?.feedback ?? null, // Handle potential null from AI grading
				easeChosen: easeChosen,
			},
		});

		return {
			isCorrect: aiGradingResult?.isCorrect ?? false, // Handle potential null from AI grading
			feedback: aiGradingResult?.feedback ?? null, // Handle potential null from AI grading
			practiceLogId: practiceLog.id,
		};
	}),

	getVocabSessionSummary: protectedProcedure.input(getVocabSessionSummarySchema).query(async ({ ctx, input }) => {
		const { sessionId } = input;

		const session = await ctx.prisma.practiceSession.findUnique({
			where: { id: sessionId },
			include: {
				vocabLogs: {
					include: {
						word: {
							select: {
								id: true,
								text: true,
								wordMaster: {
									select: {
										definition: true,
										sampleSentences: true,
										translations: true, // Select translations
									},
								},
							},
						},
					},
				},
			},
		});

		if (!session || session.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Practice session not found or access denied." });
		}

		const wordSummaries = session.vocabLogs.reduce((acc, log) => {
			if (!acc[log.wordId]) {
				acc[log.wordId] = {
					wordId: log.wordId,
					text: log.word.text,
					definition: log.word.wordMaster?.definition ?? null,
					sampleSentences: log.word.wordMaster?.sampleSentences ?? [],
					translations: log.word.wordMaster?.translations as Record<string, string> | null ?? null, // Cast translations to Record<string, string> | null
					attempts: [],
				};
			}
			acc[log.wordId].attempts.push({
				userSentence: log.userSentence ?? "", // Use userSentence (singular) to match schema
				isCorrect: log.isCorrect,
				aiFeedback: log.aiFeedback,
				timestamp: log.timestamp,
			});
			return acc;
		}, {} as Record<string, {
			wordId: string;
			text: string;
			definition: string | null;
			sampleSentences: string[];
			translations: Record<string, string> | null; // Correct type for translations
			attempts: {
				userSentence: string; // Use userSentence (singular)
				isCorrect: boolean | null;
				aiFeedback: string | null;
				timestamp: Date;
			}[];
		}>);

		return {
			sessionId: session.id,
			startTime: session.startTime,
			endTime: session.endTime,
			wordSummaries: Object.values(wordSummaries),
		};
	}),

listPracticeSessions: protectedProcedure
	 .input(listPracticeSessionsSchema)
	 .query(async ({ ctx, input }) => {
	   const { limit, direction, cursor } = input;
	   const sessions = await ctx.prisma.practiceSession.findMany({
	     where: {
	       userId: ctx.session.user.id,
	       type: PracticeType.VOCABULARY,
	     },
	     take: limit,
	     cursor: cursor ? { id: cursor } : undefined,
	     orderBy: {
	       createdAt: direction === "forward" ? "asc" : "desc",
	     },
	     // Include any necessary relations, e.g., vocabLogs count or summary info
	     include: {
	       _count: {
	         select: { vocabLogs: true },
	       },
	       // Add other includes if needed for the frontend display
	     },
	   });

	   // Determine the next cursor for pagination
	   const nextCursor = sessions.length > 0 ? sessions[sessions.length - 1].id : null;

	   return {
	     sessions,
	     nextCursor,
	   };
	 }),

	getVocabPracticeHistory: protectedProcedure
		.input(z.object({ wordBankId: z.string().cuid().optional(), limit: z.number().int().min(1).max(100).default(10), offset: z.number().int().min(0).default(0) }))
		.query(async ({ ctx, input }) => {
			const { wordBankId, limit, offset } = input;

			// If wordBankId is provided, check access
			if (wordBankId) {
				const { hasAccess } = await checkWordBankAccess(ctx.prisma, ctx.session.user.id, wordBankId);
				if (!hasAccess) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Word bank not found or access denied.",
					});
				}
			}

			const whereClause: Prisma.PracticeSessionWhereInput = {
				userId: ctx.session.user.id,
				type: PracticeType.VOCABULARY,
				...(wordBankId && { wordBankId }), // Filter by wordBankId if provided
			};

			const items = await ctx.prisma.practiceSession.findMany({
				where: whereClause,
				include: {
					wordBank: { select: { id: true, name: true } },
					_count: { select: { vocabLogs: true } },
				},
				orderBy: { startTime: "desc" },
				take: limit,
				skip: offset,
			});

			type SessionWithRelations = Prisma.PracticeSessionGetPayload<{
				include: {
					wordBank: { select: { id: true, name: true } };
					_count: { select: { vocabLogs: true } };
				};
			}>;

			const sessionsWithCount = items.map((s: SessionWithRelations) => ({
				...s,
				wordCount: s._count.vocabLogs,
			}));

			const totalCount = await ctx.prisma.practiceSession.count({ where: whereClause });

			return {
				items: sessionsWithCount,
				totalCount,
			};
		}),

	getWordPracticeHistory: protectedProcedure.input(getWordHistorySchema).query(async ({ ctx, input }) => {
		const { wordId } = input;

		// Find the word and its word bank to check access
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: { wordBank: { select: { id: true } } },
		});

		if (!word) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found." });
		}

		const { hasAccess } = await checkWordBankAccess(ctx.prisma, ctx.session.user.id, word.wordBank.id);
		if (!hasAccess) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
		}

		const history = await ctx.prisma.wordPracticeLog.findMany({
			where: { wordId: wordId },
			orderBy: { timestamp: "desc" },
			include: {
				practiceSession: {
					select: { startTime: true, endTime: true },
				},
			},
		});

		return history;
	}),

	getWordsDueForReview: protectedProcedure.query(async ({ ctx }) => {
		const words = await ctx.prisma.word.findMany({
			where: {
				wordBank: { userId: ctx.session.user.id },
				nextReviewDate: { lte: new Date() },
			},
			select: { id: true, text: true, nextReviewDate: true },
		});
		return words;
	}),

	getWordHint: protectedProcedure.input(z.object({ wordId: z.string().cuid() })).query(async ({ ctx, input }) => {
		const { wordId } = input;

		// Find the word and its word bank to check access
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: {
				wordBank: { select: { id: true } },
				wordMaster: {
					select: {
						definition: true,
						sampleSentences: true,
						translations: true,
					},
				},
			},
		});

		if (!word) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found." });
		}

		const { hasAccess } = await checkWordBankAccess(ctx.prisma, ctx.session.user.id, word.wordBank.id);
		if (!hasAccess) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
		}

		// Return available hints
		return {
			definition: word.wordMaster?.definition ?? null,
			sampleSentences: word.wordMaster?.sampleSentences ?? [],
			translations: word.wordMaster?.translations,
		};
	}),
});

interface WordSrsForCalculation {
	id: string;
	text: string;
	interval: number;
	easeFactor: number;
	repetitions: number;
	nextReviewDate: Date;
	wordMaster: {
		sampleSentences: string[];
	} | null;
}
