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









	toggleWordStarSchema,
	updateWordNotesSchema, // Add schema import
	updateWordSchema,
	wordBankSchema
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
        practiceLogs: true
      }
    }
  }
}>;

// Vocab Router
// Helper function for overall stats calculation
// Use PrismaClient type for the prisma instance
async function calculateOverallStats(prisma: PrismaClient, userId: string) {
	const practiceSessionsCount = await prisma.practiceSession.count({
		where: { userId: userId, type: PracticeType.VOCABULARY }
	});

	const allUserWords = await prisma.word.findMany({
		where: { wordBank: { userId: userId } },
		select: { interval: true }
	});

	const masteredWordsCount = allUserWords.filter((w: { interval: number }) => w.interval > 30).length;

	// For overall accuracy, we need practice logs
	const logs = await prisma.wordPracticeLog.findMany({
		where: { practiceSession: { userId: userId, type: PracticeType.VOCABULARY } },
		select: { isCorrect: true }
	});

	const totalLogs = logs.length;
	const correctLogs = logs.filter((log: { isCorrect: boolean | null }) => log.isCorrect).length;
	const overallAccuracy = totalLogs > 0 ? Math.round((correctLogs / totalLogs) * 100) : 0;

	return {
		practiceSessionsCount,
		masteredWordsCount,
		overallAccuracy,
		totalWordsCount: allUserWords.length // Add total word count as well
	};
}


export const vocabRouter = router({
	// --- Word Bank CRUD ---
	createWordBank: protectedProcedure
		.input(wordBankSchema)
		.mutation(async ({ ctx, input }) => {
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
			const wordBanks = await ctx.prisma.wordBank.findMany({
				where: { userId: ctx.session.user.id },
				include: {
					words: { select: { interval: true } }, // Keep for mastery calc
					// Include the latest practice session to get the timestamp
					practiceSessions: {
						orderBy: { createdAt: 'desc' },
						take: 1,
						select: { createdAt: true }
					}
				},
				orderBy: { createdAt: "desc" },
			});
			// Define the expected type based on the Prisma query
			type BankWithRelations = Prisma.WordBankGetPayload<{
				include: {
					words: { select: { interval: true } }; // Corrected type definition
					practiceSessions: { select: { createdAt: true } };
				}
			}>;
			
			const wordBanksWithMastery = wordBanks.map((bank: BankWithRelations) => {
				const totalWords = bank.words.length;
				if (totalWords === 0) {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { words, practiceSessions, ...bankWithoutRelations } = bank;
					return {
						...bankWithoutRelations,
						wordCount: 0,
						masteryPercentage: 0,
						lastPracticedAt: practiceSessions[0]?.createdAt ?? null
					};
				}
				const masteredCount = bank.words.filter((word: { interval: number }) => word.interval > 30).length;
				const masteryPercentage = Math.round((masteredCount / totalWords) * 100);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { words, practiceSessions, ...bankWithoutRelations } = bank;
				return {
					...bankWithoutRelations,
					wordCount: totalWords,
					masteryPercentage: masteryPercentage,
					lastPracticedAt: practiceSessions[0]?.createdAt ?? null // Get timestamp or null
				};
			});
			return wordBanksWithMastery;
		} catch (error) {
			console.error("Error listing word banks:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to retrieve word banks.",
				cause: error,
			});
		}
	}),

  // --- List Practice Logs (NEW) ---
  // Fetches paginated practice logs for the user
  listPracticeLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(10),
        cursor: z.string().cuid().optional(), // Use log ID as cursor
        bankId: z.string().cuid().optional(), // Optional filter by bank
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, bankId } = input;
      const userId = ctx.session.user.id;

      const whereClause: Prisma.WordPracticeLogWhereInput = {
        practiceSession: {
          userId: userId,
          type: PracticeType.VOCABULARY,
          // Conditionally add bankId filter
          ...(bankId && { wordBankId: bankId }),
        },
      };

      try {
        const logs = await ctx.prisma.wordPracticeLog.findMany({
          take: limit + 1, // Fetch one extra to determine next cursor
          where: whereClause,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { timestamp: 'desc' }, // Order by timestamp descending
          include: {
            word: { // Include word text for context
              select: { text: true }
            },
            practiceSession: { // Include session details if needed
              select: { id: true, wordBankId: true, userId: true } // Add userId here
            }
          }
        });

        let nextCursor: typeof cursor | undefined = undefined;
        if (logs.length > limit) {
          const nextItem = logs.pop(); // Remove the extra item
          nextCursor = nextItem!.id; // Use its ID as the next cursor
        }

        // Serialize Date objects to strings
        const serializedLogs = logs.map(log => ({
          ...log,
          timestamp: log.timestamp.toISOString(),
          // Ensure nested dates are also serialized if any
        }));


        return {
          logs: serializedLogs,
          nextCursor,
        };
      } catch (error) {
        console.error("Error listing practice logs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve practice logs.",
          cause: error,
        });
      }
    }),

	// --- Overall Stats ---
	getOverallStats: protectedProcedure
		.query(async ({ ctx }) => {
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

	getById: protectedProcedure
		.input(z.object({ id: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const wordBank = await ctx.prisma.wordBank.findUnique({
				where: { id: input.id, userId: ctx.session.user.id },
				include: {
					_count: {
						select: { words: true }
					},
					words: { // Keep this if you still need noteCount calculation separately
						select: {
							notes: true
						}
					}
				}
			});
			if (!wordBank) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found." });
			}
			const noteCount = wordBank.words.filter((w: { notes: string | null }) => w.notes).length;
			return {
				...wordBank,
				noteCount
			};
		}),
	
	// Procedure to get a single word by ID (NEW)
	getWordById: protectedProcedure
		.input(z.object({ id: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const word = await ctx.prisma.word.findUnique({
				where: {
					id: input.id,
					// Ensure user owns the word bank this word belongs to
					wordBank: { userId: ctx.session.user.id }
				},
				include: {
					wordMaster: true, // Include details needed for the modal
					// Add other includes if necessary (e.g., _count for practiceLogs?)
				}
			});

			if (!word) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
			}
			// Return the word data, potentially transforming it if needed
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
      } catch (error: any) {
				if (error.code === "P2025") {
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
	listByBank: protectedProcedure
		.input(listWordsByBankSchema)
		.query(async ({ ctx, input }) => {
			const bank = await ctx.prisma.wordBank.findUnique({
				where: { id: input.wordBankId, userId: ctx.session.user.id },
				select: { id: true },
			});
			if (!bank) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found or access denied." });
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
					mastery: true,             // Add mastery
					nextDueAtReviewCount: true, // Add nextDueAtReviewCount
					timesSeen: true,            // Add timesSeen
					successRate: true,          // Add successRate
					wordMasterId: true,
					wordMaster: {
						select: {
							id: true,
							baseWord: true,
							wordType: true,
							definition: true,
							sampleSentences: true,
							translations: true,
							isDictionaryWord: true
						}
					},
					wordBank: {
						select: {
							id: true
						}
					},
					_count: {
						select: { practiceLogs: true }
					}
				},
				orderBy: { id: "asc" }, // Order by Word ID
			});

			// Transform the result (removed redundant assignments for fields now directly selected)
			// Explicitly map fields to ensure proper serialization
			return words.map((word) => ({
				id: word.id,
				text: word.text,
				interval: word.interval,
				easeFactor: word.easeFactor,
				repetitions: word.repetitions,
				nextReviewDate: word.nextReviewDate.toISOString(), // Serialize Date
				isStarred: word.isStarred,
				notes: word.notes,
				mastery: word.mastery,
				nextDueAtReviewCount: word.nextDueAtReviewCount,
				timesSeen: word.timesSeen,
				successRate: word.successRate,
				wordMasterId: word.wordMasterId,
				wordMaster: word.wordMaster, // Keep the nested object (superjson handles JSON)
				wordBankId: word.wordBank.id,
				practiceCount: word._count?.practiceLogs ?? 0,
			}));
		}),

	updateWord: protectedProcedure
		.input(updateWordSchema)
		.mutation(async ({ ctx, input }) => {
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
							isDictionaryWord: true
						}
					}
				}
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

	deleteWord: protectedProcedure
		.input(deleteWordSchema)
		.mutation(async ({ ctx, input }) => {
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

	toggleStar: protectedProcedure
		.input(toggleWordStarSchema)
		.mutation(async ({ ctx, input }) => {
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
		.input(z.object({
			wordId: z.string().cuid(),
			ease: z.number().min(1).max(4) // 1=Again, 2=Hard, 3=Good, 4=Easy
		}))
		.mutation(async ({ ctx, input }) => {
			// Verify word ownership
			const word = await ctx.prisma.word.findUnique({
				where: { id: input.wordId },
				select: {
					id: true,
					interval: true,
					easeFactor: true,
					repetitions: true,
					wordBank: { select: { userId: true } }
				}
			});

			if (!word || word.wordBank.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Word not found or access denied."
				});
			}

			// Calculate new SRS parameters by passing the required object
			const srsUpdate = calculateNextReview(
				{
					interval: word.interval,
					easeFactor: word.easeFactor,
					repetitions: word.repetitions
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
					nextReviewDate: srsUpdate.nextReviewDate // Use the calculated date
				}
			});

			return updatedWord;
		}),

		// Rate word using review-count SRS
		rateWordReviewCount: protectedProcedure
			.input(z.object({
				wordId: z.string().cuid(),
				correct: z.boolean()
			}))
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
						wordBankId: true,
						wordBank: { // Select necessary fields from WordBank for ownership check AND reviewCount
							select: {
								userId: true,
								reviewCount: true // Fetch current review count
							}
						}
					}
				});

				// Verify ownership and existence
				if (!word || !word.wordBank || word.wordBank.userId !== ctx.session.user.id) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Word not found or access denied."
					});
				}

				// Define the spaced repetition intervals
				const intervals = [1, 3, 5, 10, 20, 40];
				
				// Update word stats based on correctness
				const newMastery = input.correct
					? Math.min(word.mastery + 1, intervals.length - 1)
					: Math.max(word.mastery - 1, 0);

				const newTimesSeen = word.timesSeen + 1;
				const newSuccessRate = ((word.successRate * word.timesSeen) + (input.correct ? 1 : 0)) / newTimesSeen;

				// Calculate the next due review count
				const currentBankReviewCount = word.wordBank.reviewCount;
				const nextDueIncrement = intervals[newMastery] ?? intervals[intervals.length - 1]; // Get interval based on new mastery
				const nextDueAtReviewCount = currentBankReviewCount + nextDueIncrement;

				// Update the word and increment the bank's review count in a transaction
				const [, updatedWord] = await ctx.prisma.$transaction([
					// Increment bank review count first
					ctx.prisma.wordBank.update({
						where: { id: word.wordBankId },
						data: { reviewCount: { increment: 1 } }
					}),
					// Then update the word with new stats and next due count
					ctx.prisma.word.update({
						where: { id: input.wordId },
						data: {
							mastery: newMastery,
							timesSeen: newTimesSeen,
							successRate: newSuccessRate,
							nextDueAtReviewCount: nextDueAtReviewCount // Set the next due count
						}
					})
				]);

				return updatedWord; // Return the updated word data (second result of transaction)
		}), // End of rateWordReviewCount

	// --- Add Words (Batch) ---
	addBatch: protectedProcedure
		.input(addWordsSchema)
		.mutation(async ({ ctx, input }) => {
			const wordBank = await ctx.prisma.wordBank.findUnique({
				where: { id: input.wordBankId, userId: ctx.session.user.id },
			});
			if (!wordBank) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found or access denied." });
			}
			const words = input.wordsText.split(/\s*[\n,]\s*/).map((w: string) => w.trim()).filter((w: string) => w.length > 0);
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
									sampleSentences: enrichedData?.sampleSentence ? 
										{ default: enrichedData.sampleSentence } : {},
									translations: enrichedData?.translation ?
										{ default: enrichedData.translation } : {},
									isDictionaryWord: !!enrichedData
								}
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
									translations: {}     // Default empty JSON
								}
							});
							return { wordMasterId: wordMaster.id };
						}
					})
				);

				// Create Word records linking to WordMaster
				await ctx.prisma.word.createMany({
					data: wordRecords.map((wr: {wordMasterId: string}, index: number) => ({
						text: words[index], // Add the original text back
						wordMasterId: wr.wordMasterId,
						wordBankId: input.wordBankId
					})),
					skipDuplicates: true
				});
				return { success: true, count: words.length };
			} catch (error) {
				console.error("Error adding words:", error);
				throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add words." });
			}
		}),

	// --- Vocabulary Practice ---
	startVocabSession: protectedProcedure
		.input(startVocabSessionSchema)
		.mutation(async ({ ctx, input }) => {
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

	startQuickVocabSession: protectedProcedure
		.input(z.void())
		.mutation(async ({ ctx }) => {
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

	getNextVocabWord: protectedProcedure
		.input(getNextVocabWordSchema)
		.query(async ({ ctx, input }) => {
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
			const practicedWordIds = (await ctx.prisma.wordPracticeLog.findMany({
				where: { practiceSessionId }, select: { wordId: true },
			})).map((log: {wordId: string}) => log.wordId);

			let wordBankReviewCount: number | null = null;
			const whereClause: Prisma.WordWhereInput = { // Use Prisma type for better safety
				id: { notIn: practicedWordIds },
			};

			// Determine the review count and filter by bank if applicable
			if (session.wordBankId) {
				const wordBank = await ctx.prisma.wordBank.findUnique({
					where: { id: session.wordBankId },
					select: { reviewCount: true }
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
				orderBy: wordBankReviewCount !== null
					? { nextDueAtReviewCount: "asc" }
					: { nextReviewDate: "asc" },
				include: { wordMaster: true } // Include wordMaster for display
			});

			return nextWord; // Return the found word or null
		}),

	submitVocabAnswer: protectedProcedure
		.input(submitVocabAnswerSchema)
		.mutation(async ({ ctx, input }) => {
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
						repetitions: true 
					} 
				});

				if (!word) {
					throw new TRPCError({ code: "NOT_FOUND", message: "Word not found." });
				}

				// Fetch user's grade level from their profile
				const user = await ctx.prisma.user.findUnique({
					where: { id: userId },
					select: { gradeLevel: true }
				});
				const gradeLevel = user?.gradeLevel ?? null;

				let gradingResult: { isCorrect: boolean; feedback: string };
				try {
					const aiResult = await gradeSentence(word.text, userSentence, gradeLevel);
					if (aiResult === null || typeof aiResult.isCorrect !== 'boolean' || typeof aiResult.feedback !== 'string') {
						console.error("Invalid response structure from /api/grade-sentence:", aiResult);
						throw new Error("Invalid response structure from AI grading service.");
					}
					gradingResult = aiResult;
				} catch (apiError: any) { // Catch specific error type if possible
					console.error("Error calling /api/grade-sentence:", apiError);
					gradingResult = { isCorrect: false, feedback: `Could not get AI feedback: ${apiError.message}` }; // Include error message
				}

				// Calculate SM2 update based on easeChosen by passing the required object
				const srsUpdate = calculateNextReview(
					{
						interval: word.interval,
						easeFactor: word.easeFactor,
						repetitions: word.repetitions
					},
					easeChosen
				);

				// Transaction to log the practice and update the word's SRS state
				await ctx.prisma.$transaction([ // Removed unused 'updatedWord' variable from transaction result
					ctx.prisma.wordPracticeLog.create({
						data: {
							practiceSessionId,
							wordId,
							userSentence,
							isCorrect: gradingResult.isCorrect,
							aiFeedback: gradingResult.feedback,
							easeChosen,
							hintUsed: input.easeChosen === 1 // Mark as hint used if ease is 1 (AGAIN)
						},
					}),
					ctx.prisma.word.update({ 
						where: { id: wordId }, 
						data: { 
							interval: srsUpdate.interval,
							easeFactor: srsUpdate.easeFactor,
							repetitions: srsUpdate.repetitions,
							nextReviewDate: new Date(Date.now() + srsUpdate.interval * 24 * 60 * 60 * 1000)
						} 
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
						nextReviewDate: finalUpdatedWord?.nextReviewDate 
					},
				};
			} catch (error) {
				console.error("Error submitting vocab answer:", error);
				if (error instanceof TRPCError) throw error;
				throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to submit answer." });
			}
		}),

	getVocabSessionSummary: protectedProcedure
		.input(getVocabSessionSummarySchema)
		.query(async ({ ctx, input }) => {
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
								select: { text: true }
							}
						}
					}
				},
			});
			if (!session) { throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." }); }
			if (session.type !== PracticeType.VOCABULARY) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Session is not a vocabulary practice session."
				});
			}

			const totalWords = session.vocabLogs.length;
			const correctCount = session.vocabLogs.filter((log: {isCorrect: boolean | null}) => log.isCorrect).length; // Allow null isCorrect
			const hintUsedCount = session.vocabLogs.filter((log: {hintUsed: boolean}) => log.hintUsed).length;
			const accuracy = totalWords > 0 ? (correctCount / totalWords) * 100 : 0;

			return {
				sessionId: session.id, startTime: session.startTime, endTime: session.endTime,
				totalWords, correctCount, hintUsedCount, accuracy: parseFloat(accuracy.toFixed(1)),
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
				orderBy: { startTime: 'desc' },
        include: {
          _count: { select: { vocabLogs: true } },
          wordBank: { select: { name: true } }
        }
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
				}
			}>;

			const sessions = items.map((s: SessionWithRelations) => ({
				id: s.id, startTime: s.startTime, endTime: s.endTime,
				wordBankId: s.wordBankId,
				wordBankName: s.wordBank?.name ?? null,
				wordsStudied: s._count.vocabLogs,
				accuracy: s.score ?? 0, // Assuming score represents accuracy
			}));
			return { sessions, nextCursor };
		}),

	// --- Word Practice History ---
	getWordPracticeHistory: protectedProcedure
		.input(getWordHistorySchema)
		.query(async ({ ctx, input }) => {
			const { wordId } = input;
			const word = await ctx.prisma.word.findUnique({
				where: { id: wordId }, select: { id: true, wordBank: { select: { userId: true } } },
			});
			if (!word || word.wordBank.userId !== ctx.session.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
			}
			const history = await ctx.prisma.wordPracticeLog.findMany({
				where: { wordId: wordId }, orderBy: { timestamp: "desc" },
				select: { id: true, timestamp: true, userSentence: true, isCorrect: true, aiFeedback: true, easeChosen: true },
			});
			return history;
		}),

	// --- User Stats ---
	getPracticeStats: protectedProcedure
		.input(z.object({ userId: z.string() })) // Input validation for userId
		.query(async ({ ctx, input }) => { // Use input userId
			// Optional: Add check to ensure the requesting user can view stats for input.userId
			// if (ctx.session.user.id !== input.userId && ctx.session.user.role !== 'ADMIN') {
			//   throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to view these stats." });
			// }
			const userId = input.userId; // Use the validated userId from input
			
			const [totalWords, sessionsCompleted, masteredWords] = await Promise.all([
				ctx.prisma.word.count({
					where: { wordBank: { userId } }
				}),
				ctx.prisma.practiceSession.count({
					where: { userId, type: 'VOCABULARY' }
				}),
				ctx.prisma.word.count({
					where: { 
						wordBank: { userId },
						interval: { gt: 30 } // Words with interval > 30 days are considered mastered
					}
				})
			]);

			return {
				totalWords,
				sessionsCompleted,
				masteredWords
			};
		}),

	// --- Get Word Hint ---
	getWordHint: protectedProcedure
		.input(z.object({ wordId: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const { wordId } = input;
			const word = await ctx.prisma.word.findUnique({
				where: {
					id: wordId,
					wordBank: {
						userId: ctx.session.user.id
					}
				},
				select: {
					id: true,
					text: true, // Keep for potential enrichment fallback
					wordMaster: { // Select the related WordMaster
						select: {
							id: true,
							baseWord: true,
							wordType: true,
							definition: true,
							sampleSentences: true,
							translations: true,
						}
					}
				}
			});

			if (!word || !word.wordMaster) { // Check if word and wordMaster exist
				throw new TRPCError({ code: "NOT_FOUND", message: "Word or associated master record not found or access denied." });
			}

			const { wordMaster } = word;
			const baseWord = wordMaster.baseWord; // Use baseWord from master

			// Check which hint fields are missing in WordMaster
			const missingFields = [];
			if (!wordMaster.wordType) missingFields.push('wordType');
			if (!wordMaster.definition) missingFields.push('definition');
			// Check if default sample sentence exists (assuming 'default' key)
			if (!wordMaster.sampleSentences || !(wordMaster.sampleSentences as any)?.default) missingFields.push('sampleSentence');
			// Check if default translation exists (assuming 'default' key)
			if (!wordMaster.translations || !(wordMaster.translations as any)?.default) missingFields.push('translation');


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
					if (missingFields.includes('wordType') && enrichedData.wordType) {
						updateData.wordType = enrichedData.wordType;
					}
					if (missingFields.includes('definition') && enrichedData.definition) {
						updateData.definition = enrichedData.definition;
					}
					if (missingFields.includes('sampleSentence') && enrichedData.sampleSentence) {
						// Update the 'default' sample sentence
						updateData.sampleSentences = { ...(wordMaster.sampleSentences as any || {}), default: enrichedData.sampleSentence };
					}
					if (missingFields.includes('translation') && enrichedData.translation) {
						// Update the 'default' translation
						updateData.translations = { ...(wordMaster.translations as any || {}), default: enrichedData.translation };
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
