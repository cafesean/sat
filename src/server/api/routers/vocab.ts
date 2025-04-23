import { enrichWord, gradeSentence } from "@/lib/api/gemini";
import { calculateNextReview } from "@/lib/srs/sm2";
import {
	getNextVocabWordSchema,
	getVocabSessionSummarySchema,
	PracticeType,
	startVocabSessionSchema,
	submitVocabAnswerSchema,
} from "@/schemas/practice.schema";
import {
	addWordsSchema,
	deleteWordSchema,
	getWordHistorySchema,
	listWordsByBankSchema,
	rateWordReviewCountSchema,
	toggleWordStarSchema,
	updateWordNotesSchema, // Add schema import
	updateWordSchema,
	wordBankSchema,
} from "@/schemas/vocab.schema";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
// Removed duplicate import of rateWordReviewCountSchema

type WordWithRelations = Prisma.WordGetPayload<{
	include: {
		wordMaster: true;
		wordBank: true;
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

	// New procedure to get word by text and bankId
	getWordByText: protectedProcedure
		.input(z.object({ text: z.string(), wordBankId: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const { text, wordBankId } = input;
			const word = await ctx.prisma.word.findFirst({
				where: {
					text: text,
					wordBankId: wordBankId,
				},
				include: {
					wordMaster: true,
				},
			});
			if (!word) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: `Word "${text}" not found in word bank.`,
				});
			}
			return word;
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
			const [ownedBanks, sharedBanks] = await Promise.all([
				ctx.prisma.wordBank.findMany({
					where: { userId: ctx.session.user.id },
					include: {
						words: { select: { interval: true } },
						practiceSessions: {
							orderBy: { createdAt: "desc" },
							take: 1,
							select: { createdAt: true },
						},
						sharedWordBanks: { // Include sharedWordBanks for owned banks as well
							include: {
								sharedWithGroup: {
									include: {
										members: {
											where: { userId: ctx.session.user.id }, // Filter members to current user
											select: { role: true, groupId: true }, // Select role and groupId
										}
									}
								}
							}
						}
					},
					orderBy: { createdAt: "desc" },
				}),
				ctx.prisma.wordBank.findMany({
					where: {
						sharedWordBanks: {
							some: {
								sharedWithGroup: {
									members: {
										some: { userId: ctx.session.user.id }
									}
								}
							}
						}
					},
					include: {
						words: { select: { interval: true } },
						practiceSessions: {
							orderBy: { createdAt: "desc" },
							take: 1,
							select: { createdAt: true },
						},
						sharedWordBanks: { // Include sharedWordBanks for shared banks
							include: {
								sharedWithGroup: {
									include: {
										members: {
											where: { userId: ctx.session.user.id }, // Filter members to current user
											select: { role: true, groupId: true }, // Select role and groupId
										}
									}
								}
							}
						}
					},
				}),
			]);

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
			type BankWithDetails = Prisma.WordBankGetPayload<{
				include: {
					words: { select: { interval: true } };
					practiceSessions: { select: { createdAt: true } };
					sharedWordBanks: {
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
			type WordBankWithGroupInfo = Omit<BankWithDetails, 'words' | 'practiceSessions' | 'sharedWordBanks'> & {
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
				const sharedGroups = bank.sharedWordBanks
					.map(swb => swb.sharedWithGroup)
					.filter(group => group !== null) // Filter out null groups if any
					.map(group => ({
						id: group.id,
						name: group.name,
						userRole: group.members[0]?.role ?? null, // Get the role of the current user
					}));

				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { words, practiceSessions, sharedWordBanks, ...bankWithoutRelations } = bank;

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
			include: {
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
			},
		});
		return updatedWord;
	}),

	updateWordNotes: protectedProcedure
		.input(updateWordNotesSchema) // Use the new schema
		.mutation(async ({ ctx, input }) => {
			const { wordId, notes } = input;
			// Verify ownership
			const word = await ctx.prisma.word.findUnique({
				where: { id: wordId },
				select: { wordBank: { select: { userId: true } } },
			});
			if (!word || word.wordBank.userId !== ctx.session.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
			}
			// Update notes
			const updatedWord = await ctx.prisma.word.update({
				where: { id: wordId },
				data: { notes: notes }, // Update only the notes field
				select: { id: true, notes: true }, // Return updated notes
			});
			return updatedWord;
		}),

	deleteWord: protectedProcedure.input(deleteWordSchema).mutation(async ({ ctx, input }) => {
		const { wordId } = input;
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: { id: true, wordBank: { select: { userId: true } } },
		});
		if (!word || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
		}
		await ctx.prisma.word.delete({ where: { id: wordId } });
		return { success: true, deletedWordId: wordId };
	}),

	toggleStar: protectedProcedure.input(toggleWordStarSchema).mutation(async ({ ctx, input }) => {
		const { wordId } = input;
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: { isStarred: true, wordBank: { select: { userId: true } } },
		});

		if (!word || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
		}

		const updatedWord = await ctx.prisma.word.update({
			where: { id: wordId },
			data: { isStarred: !word.isStarred },
			select: { id: true, isStarred: true },
		});

		return updatedWord;
	}),

	// Rate word during learning session (SM2)
	rateWord: protectedProcedure
		.input(
			z.object({
				wordId: z.string().cuid(),
				ease: z.number().min(1).max(4), // 1=Again, 2=Hard, 3=Good, 4=Easy
				sessionId: z.string().cuid().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			// Verify word ownership
			const word = await ctx.prisma.word.findUnique({
				where: { id: input.wordId },
				select: {
					id: true,
					interval: true,
					easeFactor: true,
					repetitions: true,
					wordBank: { select: { userId: true } },
				},
			});

			if (!word || word.wordBank.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Word not found or access denied.",
				});
			}

			// Calculate new SRS parameters by passing the required object
			const srsUpdate = calculateNextReview(
				{
					interval: word.interval,
					easeFactor: word.easeFactor,
					repetitions: word.repetitions,
				},
				input.ease
			);

			// Update word with new SRS parameters
			const updatedWord = await ctx.prisma.word.update({
				where: { id: input.wordId },
				data: {
					interval: srsUpdate.interval,
					easeFactor: srsUpdate.easeFactor,
					repetitions: srsUpdate.repetitions,
					nextReviewDate: srsUpdate.nextReviewDate, // Use the calculated date
				},
			});

			return updatedWord;
		}),

	// Rate word using review-count SRS
	rateWordReviewCount: protectedProcedure
	  .input(
	    rateWordReviewCountSchema.extend({
	      sessionId: z.string().cuid().optional(),
	    })
	  )
	  .mutation(async ({ ctx, input }) => {
		// Verify word ownership
		const word = await ctx.prisma.word.findUnique({
			where: { id: input.wordId },
			select: {
				id: true,
				mastery: true,
				nextDueAtReviewCount: true,
				timesSeen: true,
				successRate: true,
				wordBankId: true, // Need wordBankId to update the correct counter
				wordBank: { select: { userId: true, reviewCount: true } }, // Need current bank reviewCount
			},
		});

		// Verify ownership and existence
		if (!word || !word.wordBank || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Word not found or access denied.",
			});
		}

		// Define the spaced repetition intervals
		const intervals = [1, 3, 5, 10, 20, 40];

		// Update word stats based on correctness
		const newMastery = input.correct ? Math.min(word.mastery + 1, intervals.length - 1) : Math.max(word.mastery - 1, 0);

		const newTimesSeen = word.timesSeen + 1;
		const newSuccessRate = (word.successRate * word.timesSeen + (input.correct ? 1 : 0)) / newTimesSeen;

		// Update the word and the specific word bank's review count in a transaction
		const [updatedWord] = await ctx.prisma.$transaction([
			ctx.prisma.word.update({
				where: { id: input.wordId },
				data: {
					mastery: newMastery,
					// Use the word bank's current reviewCount for scheduling
					nextDueAtReviewCount: word.wordBank.reviewCount + intervals[newMastery],
					timesSeen: newTimesSeen,
					successRate: newSuccessRate,
				},
			}),
			ctx.prisma.wordBank.update({
				// Update WordBank instead of User
				where: { id: word.wordBankId }, // Use the word's wordBankId
				// Increment the word bank's review count
				data: { reviewCount: { increment: 1 } },
			}),
		]);

		return updatedWord; // Return the updated word data
	}), // End of rateWordReviewCount

	// --- Add Words (Batch) ---
	addBatch: protectedProcedure.input(addWordsSchema).mutation(async ({ ctx, input }) => {
		const wordBank = await ctx.prisma.wordBank.findUnique({
			where: { id: input.wordBankId, userId: ctx.session.user.id },
		});
		if (!wordBank) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found or access denied." });
		}
		const words = input.wordsText
			.split(/\s*[\n,]\s*/)
			.map((w: string) => w.trim())
			.filter((w: string) => w.length > 0);
		if (words.length === 0) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "No valid words found in the input." });
		}
		try {
			const wordRecords = await Promise.all(
				words.map(async (wordText: string) => {
					try {
						// Check if word exists in WordMaster (baseWord or variations) using raw SQL for JSON check
						const existingWords = await ctx.prisma.$queryRaw<Array<{ id: string }>>`
								SELECT id FROM "WordMaster" WHERE "baseWord" = ${wordText} OR variations @> ${JSON.stringify([wordText])}::jsonb LIMIT 1
							`;
						const existingWord = existingWords[0]; // Get the first result if any

						if (existingWord) {
							return { wordMasterId: existingWord.id };
						}

						// If not, enrich and create new WordMaster
						const enrichedData = await enrichWord(wordText);
						const wordMaster = await ctx.prisma.wordMaster.create({
							data: {
								baseWord: wordText,
								variations: [wordText],
								wordType: enrichedData?.wordType,
								definition: enrichedData?.definition,
								sampleSentences: enrichedData?.sampleSentences?.length
									? { default: enrichedData.sampleSentences[0] }
									: {},
								translations: enrichedData?.translation ? { default: enrichedData.translation } : {},
								isDictionaryWord: !!enrichedData,
							},
						});

						return { wordMasterId: wordMaster.id };
					} catch (error) {
						console.error(`Error processing word "${wordText}":`, error);
						// Create basic WordMaster record if enrichment fails
						// Create basic WordMaster record if enrichment fails, including default JSON objects
						const wordMaster = await ctx.prisma.wordMaster.create({
							data: {
								baseWord: wordText,
								variations: [wordText], // Store as JSON array
								isDictionaryWord: false,
								sampleSentences: {}, // Default empty JSON
								translations: {}, // Default empty JSON
							},
						});
						return { wordMasterId: wordMaster.id };
					}
				})
			);

			// Create Word records linking to WordMaster
			await ctx.prisma.word.createMany({
				data: wordRecords.map((wr: { wordMasterId: string }, index: number) => ({
					text: words[index], // Add the original text back
					wordMasterId: wr.wordMasterId,
					wordBankId: input.wordBankId,
				})),
				skipDuplicates: true,
			});
			return { success: true, count: words.length };
		} catch (error) {
			console.error("Error adding words:", error);
			throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add words." });
		}
	}),

	// --- Vocabulary Practice ---
	startVocabSession: protectedProcedure.input(startVocabSessionSchema).mutation(async ({ ctx, input }) => {
		try {
			const bank = await ctx.prisma.wordBank.findUnique({
				where: { id: input.wordBankId, userId: ctx.session.user.id },
				select: { id: true },
			});
			if (!bank) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found or access denied." });
			}
			const session = await ctx.prisma.practiceSession.create({
				data: { userId: ctx.session.user.id, type: PracticeType.VOCABULARY, wordBankId: input.wordBankId },
			});
			return { practiceSessionId: session.id };
		} catch (error) {
			console.error("Error starting vocab session:", error);
			throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to start session." });
		}
	}),

	startQuickVocabSession: protectedProcedure.input(z.void()).mutation(async ({ ctx }) => {
		try {
			const session = await ctx.prisma.practiceSession.create({
				data: { userId: ctx.session.user.id, type: PracticeType.VOCABULARY },
			});
			return { practiceSessionId: session.id };
		} catch (error) {
			console.error("Error starting quick vocab session:", error);
			throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to start quick session." });
		}
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
				select: { reviewCount: true },
			});
			if (!wordBank) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word bank for session not found." });
			}
			wordBankReviewCount = wordBank.reviewCount;
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

		// Add review count condition ONLY if we have a specific bank's count
		if (wordBankReviewCount !== null) {
			whereClause.nextDueAtReviewCount = { lte: wordBankReviewCount };
		}

		const nextWord = await ctx.prisma.word.findFirst({
			where: whereClause,
			// Prioritize by review count if available, otherwise by date
			orderBy: wordBankReviewCount !== null ? { nextDueAtReviewCount: "asc" } : { nextReviewDate: "asc" },
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
				// Select fields needed for SM2 calculation
				select: {
					id: true,
					text: true,
					interval: true,
					easeFactor: true,
					repetitions: true,
				},
			});

			if (!word) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word not found." });
			}

			const userGradeLevel = ctx.session.user.gradeLevel;

			let gradingResult: { isCorrect: boolean; feedback: string };
			try {
				const aiResult = await gradeSentence(word.text, userSentence);
				if (aiResult === null || typeof aiResult.isCorrect !== "boolean" || typeof aiResult.feedback !== "string") {
					console.error("Invalid response structure from /api/grade-sentence:", aiResult);
					throw new Error("Invalid response structure from AI grading service.");
				}
				gradingResult = aiResult;
			} catch (apiError) {
				// Catch specific error type if possible
				console.error("Error calling /api/grade-sentence:", apiError);
				gradingResult = {
					isCorrect: false,
					feedback: `Could not get AI feedback: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`
				};
			}

			// Calculate SM2 update based on easeChosen by passing the required object
			const srsUpdate = calculateNextReview(
				{
					interval: word.interval,
					easeFactor: word.easeFactor,
					repetitions: word.repetitions,
				},
				easeChosen
			);

			// Transaction to log the practice and update the word's SRS state
			await ctx.prisma.$transaction([
				// Removed unused 'updatedWord' variable from transaction result
				ctx.prisma.wordPracticeLog.create({
					data: {
						practiceSessionId,
						wordId,
						userSentence,
						isCorrect: gradingResult.isCorrect,
						aiFeedback: gradingResult.feedback,
						easeChosen,
						hintUsed: input.easeChosen === 1, // Mark as hint used if ease is 1 (AGAIN)
					},
				}),
				ctx.prisma.word.update({
					where: { id: wordId },
					data: {
						interval: srsUpdate.interval,
						easeFactor: srsUpdate.easeFactor,
						repetitions: srsUpdate.repetitions,
						nextReviewDate: new Date(Date.now() + srsUpdate.interval * 24 * 60 * 60 * 1000),
					},
				}),
			]);

			// Fetch the updated word again to return the full SRS state
			const finalUpdatedWord = await ctx.prisma.word.findUnique({ where: { id: wordId } });

			return {
				isCorrect: gradingResult.isCorrect,
				feedback: gradingResult.feedback,
				updatedWordSrs: {
					interval: finalUpdatedWord?.interval,
					easeFactor: finalUpdatedWord?.easeFactor,
					repetitions: finalUpdatedWord?.repetitions,
					nextReviewDate: finalUpdatedWord?.nextReviewDate,
				},
			};
		} catch (error) {
			console.error("Error submitting vocab answer:", error);
			if (error instanceof TRPCError) throw error;
			throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to submit answer." });
		}
	}),

	getVocabSessionSummary: protectedProcedure.input(getVocabSessionSummarySchema).query(async ({ ctx, input }) => {
		const { practiceSessionId } = input;
		const session = await ctx.prisma.practiceSession.findUnique({
			where: { id: practiceSessionId, userId: ctx.session.user.id },
			include: {
				vocabLogs: {
					select: {
						id: true,
						isCorrect: true,
						hintUsed: true,
						word: {
							select: { text: true },
						},
					},
				},
			},
		});
		if (!session) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
		}
		if (session.type !== PracticeType.VOCABULARY) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Session is not a vocabulary practice session.",
			});
		}

		const totalWords = session.vocabLogs.length;
		const correctCount = session.vocabLogs.filter((log: { isCorrect: boolean | null }) => log.isCorrect).length; // Allow null isCorrect
		const hintUsedCount = session.vocabLogs.filter((log: { hintUsed: boolean }) => log.hintUsed).length;
		const accuracy = totalWords > 0 ? (correctCount / totalWords) * 100 : 0;

		return {
			sessionId: session.id,
			startTime: session.startTime,
			endTime: session.endTime,
			totalWords,
			correctCount,
			hintUsedCount,
			accuracy: parseFloat(accuracy.toFixed(1)),
			logs: session.vocabLogs,
		};
	}),

	// --- List Practice Sessions ---
	listPracticeSessions: protectedProcedure
		.input(z.object({ limit: z.number().min(1).max(50).optional().default(10), cursor: z.string().cuid().optional() }))
		.query(async ({ ctx, input }) => {
			const limit = input.limit;
			const { cursor } = input;
			const items = await ctx.prisma.practiceSession.findMany({
				take: limit + 1,
				where: { userId: ctx.session.user.id, type: PracticeType.VOCABULARY },
				cursor: cursor ? { id: cursor } : undefined,
				orderBy: { startTime: "desc" },
				include: {
					_count: { select: { vocabLogs: true } },
					wordBank: { select: { name: true } },
				},
			});
			let nextCursor: typeof cursor | undefined = undefined;
			if (items.length > limit) {
				const nextItem = items.pop();
				nextCursor = nextItem!.id;
			}
			// Define the expected type for 's' based on the Prisma query result
			type SessionWithRelations = Prisma.PracticeSessionGetPayload<{
				include: {
					wordBank: { select: { name: true } };
					_count: { select: { vocabLogs: true } };
				};
			}>;

			const sessions = items.map((s: SessionWithRelations) => ({
				id: s.id,
				startTime: s.startTime,
				endTime: s.endTime,
				wordBankId: s.wordBankId,
				wordBankName: s.wordBank?.name ?? null,
				wordsStudied: s._count.vocabLogs,
				accuracy: s.score ?? 0, // Assuming score represents accuracy
			}));
			return { sessions, nextCursor };
		}),

	// --- Word Practice History ---
	getWordPracticeHistory: protectedProcedure.input(getWordHistorySchema).query(async ({ ctx, input }) => {
		const { wordId } = input;
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: { id: true, wordBank: { select: { userId: true } } },
		});
		if (!word || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
		}
		const history = await ctx.prisma.wordPracticeLog.findMany({
			where: { wordId: wordId },
			orderBy: { timestamp: "desc" },
			select: { id: true, timestamp: true, userSentence: true, isCorrect: true, aiFeedback: true, easeChosen: true },
		});
		return history;
	}),

	// --- User Stats ---
	getPracticeStats: protectedProcedure
		.input(z.object({ userId: z.string() })) // Input validation for userId
		.query(async ({ ctx, input }) => {
			// Use input userId
			// Optional: Add check to ensure the requesting user can view stats for input.userId
			// if (ctx.session.user.id !== input.userId && ctx.session.user.role !== 'ADMIN') {
			//   throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to view these stats." });
			// }
			const userId = input.userId; // Use the validated userId from input

			const [totalWords, sessionsCompleted, masteredWords] = await Promise.all([
				ctx.prisma.word.count({
					where: { wordBank: { userId } },
				}),
				ctx.prisma.practiceSession.count({
					where: { userId, type: "VOCABULARY" },
				}),
				ctx.prisma.word.count({
					where: {
						wordBank: { userId },
						interval: { gt: 30 }, // Words with interval > 30 days are considered mastered
					},
				}),
			]);

			return {
				totalWords,
				sessionsCompleted,
				masteredWords,
			};
		}),

	// --- Get Word Hint ---
	getWordHint: protectedProcedure.input(z.object({ wordId: z.string().cuid() })).query(async ({ ctx, input }) => {
		const { wordId } = input;
		const word = await ctx.prisma.word.findUnique({
			where: {
				id: wordId,
				wordBank: {
					userId: ctx.session.user.id,
				},
			},
			select: {
				id: true,
				text: true, // Keep for potential enrichment fallback
				wordMaster: {
					// Select the related WordMaster
					select: {
						id: true,
						baseWord: true,
						wordType: true,
						definition: true,
						sampleSentences: true,
						translations: true,
					},
				},
			},
		});

		if (!word || !word.wordMaster) {
			// Check if word and wordMaster exist
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Word or associated master record not found or access denied.",
			});
		}

		const { wordMaster } = word;
		const baseWord = wordMaster.baseWord; // Use baseWord from master

		// Check which hint fields are missing in WordMaster
		const missingFields = [];
		if (!wordMaster.wordType) missingFields.push("wordType");
		if (!wordMaster.definition) missingFields.push("definition");
		// Check if default sample sentence exists (assuming 'default' key)
		if (!wordMaster.sampleSentences || !(wordMaster.sampleSentences as any)?.default)
			missingFields.push("sampleSentence");
		// Check if default translation exists (assuming 'default' key)
		if (!wordMaster.translations || !(wordMaster.translations as any)?.default) missingFields.push("translation");

		if (missingFields.length > 0) {
			// Generate missing fields using AI based on the baseWord
			const enrichedData = await enrichWord(
				baseWord, // Use baseWord for enrichment
				ctx.session.user.languagePreference,
				ctx.session.user.gradeLevel
			);

			if (enrichedData) {
				// Prepare update data for WordMaster
				const updateData: any = {}; // Use any for flexibility with JSON fields
				if (missingFields.includes("wordType") && enrichedData.wordType) {
					updateData.wordType = enrichedData.wordType;
				}
				if (missingFields.includes("definition") && enrichedData.definition) {
					updateData.definition = enrichedData.definition;
				}
				if (missingFields.includes("sampleSentence") && enrichedData.sampleSentences?.length) {
					// Update the 'default' sample sentence with first from array
					updateData.sampleSentences = {
						...((wordMaster.sampleSentences as any) || {}),
						default: enrichedData.sampleSentences[0],
					};
				}
				if (missingFields.includes("translation") && enrichedData.translation) {
					// Update the 'default' translation
					updateData.translations = { ...((wordMaster.translations as any) || {}), default: enrichedData.translation };
				}

				// Update the WordMaster record
				if (Object.keys(updateData).length > 0) {
					const updatedWordMaster = await ctx.prisma.wordMaster.update({
						where: { id: wordMaster.id },
						data: updateData,
					});
					// Return the updated hint data
					return {
						wordType: updatedWordMaster.wordType || null,
						definition: updatedWordMaster.definition || null,
						sampleSentence: (updatedWordMaster.sampleSentences as any)?.default || null,
						translation: (updatedWordMaster.translations as any)?.default || null,
					};
				}
			} else {
				// Enrichment failed, return existing data but log the failure
				console.error(`Enrichment failed for word: ${baseWord} (Master ID: ${wordMaster.id})`);
			}
		}

		// No missing fields initially or enrichment failed, return existing data from WordMaster
		return {
			wordType: wordMaster.wordType || null,
			definition: wordMaster.definition || null,
			sampleSentence: (wordMaster.sampleSentences as any)?.default || null,
			translation: (wordMaster.translations as any)?.default || null,
		};
	}),
});
