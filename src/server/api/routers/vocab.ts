import { enrichWord } from "@/lib/api/gemini";
import { calculateNextReview } from "@/lib/srs/sm2";
import {
  getNextVocabWordSchema,
  getVocabSessionSummarySchema,
  startVocabSessionSchema,
  submitVocabAnswerSchema,
} from "@/schemas/practice.schema";
import {
  addWordsSchema,
  deleteWordSchema,
  getWordHistorySchema,
  listWordsByBankSchema,
  updateWordSchema,
  wordBankSchema,
} from "@/schemas/vocab.schema"; // Import new schemas + getWordHistorySchema
// Import Prisma types correctly
import { gradeSentence } from "@/lib/api/gemini"; // Re-add gradeSentence import
import { PracticeType, WordPracticeLog } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod"; // Re-add zod import
import { protectedProcedure, router } from "../trpc";

export const vocabRouter = router({
	// --- Word Bank CRUD ---
	createWordBank: protectedProcedure // Change back to protectedProcedure
		.input(wordBankSchema) // Restore automatic input validation
		.mutation(async ({ ctx, input }) => {
			// Input should now be validated and typed correctly by tRPC/Zod
			console.log("Validated input received by createWordBank:", input); // Log the validated input
			try {
				// No need for manual parsing here anymore
				// const validatedInput = wordBankSchema.parse(input); // Remove manual parse

				const newWordBank = await ctx.prisma.wordBank.create({
					data: {
						name: input.name, // Use input directly
						description: input.description, // Restore description
						userId: ctx.session.user.id, // Associate with the logged-in user
					},
				});
				return newWordBank; // Return the created bank object
			} catch (error) {
				console.error("Error creating word bank:", error);
				// Handle potential unique constraint errors or other DB errors
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create word bank.",
					cause: error,
				});
			}
		}),
	listWordBanks: protectedProcedure.query(async ({ ctx }) => {
		// Replace placeholder with actual DB query
		try {
			const wordBanks = await ctx.prisma.wordBank.findMany({
				where: {
					userId: ctx.session.user.id, // Fetch only banks belonging to the user
				},
				include: {
					// Include words with their interval to calculate mastery
					words: {
						select: { interval: true },
					},
				},
				orderBy: {
					createdAt: "desc", // Order by creation date, newest first
				},
			});
			// Map the result to calculate mastery percentage
			const wordBanksWithMastery = wordBanks.map((bank) => {
				const totalWords = bank.words.length;
				if (totalWords === 0) {
					return { ...bank, wordCount: 0, masteryPercentage: 0 };
				}
				const masteredCount = bank.words.filter((word) => word.interval > 30).length;
				const masteryPercentage = Math.round((masteredCount / totalWords) * 100);
				// We no longer need the full words array in the response
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { words, ...bankWithoutWords } = bank;
				return {
					...bankWithoutWords,
					wordCount: totalWords,
					masteryPercentage: masteryPercentage,
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
		/* Placeholder data removed:
    console.log("Listing word banks for user:", ctx.session.user.id);
    */
		// The return statement is within the 'try' block above.
	}),
	getById: protectedProcedure
		.input(z.object({ id: z.string().cuid() })) // Input schema for ID
		.query(async ({ ctx, input }) => {
			const wordBank = await ctx.prisma.wordBank.findUnique({
				where: {
					id: input.id,
					userId: ctx.session.user.id, // Ensure it belongs to the user
				},
			});
			if (!wordBank) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found." });
			}
			return wordBank;
		}),
	update: protectedProcedure
		.input(wordBankSchema.extend({ id: z.string().cuid() })) // Add ID to the schema
		.mutation(async ({ ctx, input }) => {
			const { id, ...dataToUpdate } = input; // Separate ID from data
			try {
				const updatedWordBank = await ctx.prisma.wordBank.update({
					where: {
						id: id,
						userId: ctx.session.user.id, // Ensure user owns the bank
					},
					data: dataToUpdate,
				});
				return updatedWordBank;
      } catch (error: any) {
				// Handle specific Prisma error for record not found (P2025)
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
	// ... other word bank CRUD operations ...

	// --- Word CRUD ---
	listByBank: protectedProcedure.input(listWordsByBankSchema).query(async ({ ctx, input }) => {
		// Verify user owns the bank first
		const bank = await ctx.prisma.wordBank.findUnique({
			where: { id: input.wordBankId, userId: ctx.session.user.id },
			select: { id: true }, // Only need to select ID for verification
		});
		if (!bank) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found or access denied." });
		}

		// Fetch words for the specified bank
		const words = await ctx.prisma.word.findMany({
			where: { wordBankId: input.wordBankId },
			orderBy: { createdAt: "asc" }, // Or order by text?
		});
		return words;
	}),

	updateWord: protectedProcedure.input(updateWordSchema).mutation(async ({ ctx, input }) => {
		const { wordId, text } = input;

		// Verify the word exists and belongs to the user (via the word bank)
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: { wordBank: { select: { userId: true } } }, // Select nested userId
		});

		if (!word || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
		}

		// TODO: Consider re-enriching the word with AI if the text changes significantly?
		// For now, just update the text.
		const updatedWord = await ctx.prisma.word.update({
			where: { id: wordId },
			data: { text: text },
		});
		return updatedWord;
	}),

	deleteWord: protectedProcedure.input(deleteWordSchema).mutation(async ({ ctx, input }) => {
		const { wordId } = input;

		// Verify the word exists and belongs to the user (via the word bank)
		const word = await ctx.prisma.word.findUnique({
			where: { id: wordId },
			select: { id: true, wordBank: { select: { userId: true } } }, // Select nested userId
		});

		if (!word || word.wordBank.userId !== ctx.session.user.id) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
		}

		await ctx.prisma.word.delete({
			where: { id: wordId },
		});

		return { success: true, deletedWordId: wordId };
	}),

	// --- Add Words (Batch) ---
	addBatch: protectedProcedure
		.input(addWordsSchema) // Use imported schema
		.mutation(async ({ ctx, input }) => {
			// 1. Verify the word bank exists and belongs to the user
			const wordBank = await ctx.prisma.wordBank.findUnique({
				where: { id: input.wordBankId, userId: ctx.session.user.id },
			});

			if (!wordBank) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found or access denied." });
			}

			// 2. Parse the input text into an array of words
			// Split by newline OR comma, trim whitespace, filter empty lines
			const words = input.wordsText
				.split(/\s*[\n,]\s*/) // Split by newline or comma, trimming whitespace
				.map((word) => word.trim())
				.filter((word) => word.length > 0);

			if (words.length === 0) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "No valid words found in the input." });
			}

			// 3. Enrich words and save to DB
			try {
				const wordsWithData = await Promise.all(
					words.map(async (word) => {
						// Use parsed words array
						const enrichedData = await enrichWord(word); // Uses placeholder from gemini.ts
						return {
							text: word,
							definition: enrichedData?.definition,
							sampleSentence: enrichedData?.sampleSentence,
							translation: enrichedData?.translation,
						};
					})
				);

				// Add words to the database
				await ctx.prisma.word.createMany({
					data: wordsWithData.map((wordData) => ({
						text: wordData.text,
						definition: wordData.definition,
						sampleSentence: wordData.sampleSentence,
						translation: wordData.translation,
						wordBankId: input.wordBankId,
						// SRS defaults are set in schema
					})),
					skipDuplicates: true, // Skip if word already exists in the bank
				});

				return { success: true, count: wordsWithData.length };
			} catch (error) {
				console.error("Error adding words:", error);
				throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add words." });
			}
		}),

	// --- Vocabulary Practice ---

	startVocabSession: protectedProcedure.input(startVocabSessionSchema).mutation(async ({ ctx, input }) => {
		try {
			// Verify the word bank exists and belongs to the user before creating session
			const bank = await ctx.prisma.wordBank.findUnique({
				where: { id: input.wordBankId, userId: ctx.session.user.id },
				select: { id: true },
			});
			if (!bank) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found or access denied." });
			}

			const session = await ctx.prisma.practiceSession.create({
				data: {
					userId: ctx.session.user.id,
					type: PracticeType.VOCABULARY,
					wordBankId: input.wordBankId, // Save the specific word bank ID
				},
			});
			return { practiceSessionId: session.id };
		} catch (error) {
			console.error("Error starting vocab session:", error);
			throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to start session." });
		}
	}),

	getNextVocabWord: protectedProcedure.input(getNextVocabWordSchema).query(async ({ ctx, input }) => {
		const { practiceSessionId } = input;
		const userId = ctx.session.user.id;

		// 1. Fetch the practice session to get the associated wordBankId
		// Explicitly type the session variable
		const session: { wordBankId: string | null } | null = await ctx.prisma.practiceSession.findUnique({
			where: { id: practiceSessionId, userId: userId }, // Ensure user owns the session
			select: { wordBankId: true },
		});

		if (!session) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Practice session not found." });
		}
		if (!session.wordBankId) {
			// This case should ideally not happen if sessions are created correctly via startVocabSession
			// Handle sessions started without a specific bank (e.g., quick practice) if needed later.
			throw new TRPCError({ code: "BAD_REQUEST", message: "Practice session is not linked to a specific word bank." });
		}

		// 2. Find words practiced in this session to exclude them
		const practicedWordIds = (
			await ctx.prisma.wordPracticeLog.findMany({
				where: { practiceSessionId },
				select: { wordId: true },
			})
		).map((log: { wordId: string }) => log.wordId);

		// 3. Find the next due word from the specific bank, excluding practiced words
		const nextWord = await ctx.prisma.word.findFirst({
			where: {
				wordBankId: session.wordBankId, // Filter by the bank linked to the session
				nextReviewDate: {
					lte: new Date(), // Word is due
				},
				id: {
					notIn: practicedWordIds, // Exclude already practiced words in this session
				},
			},
			orderBy: {
				nextReviewDate: "asc", // Prioritize oldest due words
			},
		});

		if (!nextWord) {
			// No more words due for review in this session
			// Optionally: Mark session as complete here?
			// await ctx.prisma.practiceSession.update({
			//   where: { id: practiceSessionId },
			//   data: { endTime: new Date() },
			// });
			return null;
		}

		return nextWord;
	}),

	submitVocabAnswer: protectedProcedure.input(submitVocabAnswerSchema).mutation(async ({ ctx, input }) => {
		const { practiceSessionId, wordId, userSentence, easeChosen } = input;
		const userId = ctx.session.user.id;
		try {
			// Fetch the word details first using wordId from input
			const word = await ctx.prisma.word.findUnique({
				where: { id: wordId },
				// Include necessary fields for SRS calculation if not default
			});

			if (!word) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word not found." });
			}

			// Optional: Verify word belongs to user (can be complex if banks aren't linked directly)
			// For now, assume wordId is valid for the user context if they have the practiceSessionId

			// Fetch the practice session (optional if not needed elsewhere in this specific logic path)
			// const session: { wordBankId: string | null } | null = await ctx.prisma.practiceSession.findUnique({
			//   where: { id: practiceSessionId, userId: userId }, // Ensure user owns the session
			//   select: { wordBankId: true }
			// });

			// 2. Call the grading function directly
			let gradingResult: { isCorrect: boolean; feedback: string };
			try {
				const aiResult = await gradeSentence(word.text, userSentence);
				if (aiResult === null) {
					// Handle case where grading might fail internally
					console.error("AI grading function returned null.");
					throw new Error("AI grading failed internally.");
				}
				// Basic validation of the direct result structure
				if (typeof aiResult?.isCorrect !== "boolean" || typeof aiResult?.feedback !== "string") {
					console.error("Invalid response structure from gradeSentence function:", aiResult);
					throw new Error("Invalid response structure from gradeSentence function.");
				}
				gradingResult = aiResult;
			} catch (aiError) {
				console.error("Error calling gradeSentence function:", aiError);
				// Provide default feedback if direct call fails
				gradingResult = { isCorrect: false, feedback: "Could not get AI feedback at this time." };
				// Optionally re-throw or handle differently
				// throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get AI grading." });
			}

			// 3. Calculate next review based on SRS
			const srsUpdate = calculateNextReview(word, easeChosen);

			// 4. Save the practice log and update the word's SRS data in a transaction
			const [, updatedWord] = await ctx.prisma.$transaction([
				ctx.prisma.wordPracticeLog.create({
					data: {
						practiceSessionId,
						wordId,
						// userId, // Removed: Not a direct field on WordPracticeLog
						userSentence,
						isCorrect: gradingResult.isCorrect,
						aiFeedback: gradingResult.feedback,
						easeChosen,
					},
				}),
				ctx.prisma.word.update({
					where: { id: wordId },
					data: {
						...srsUpdate, // interval, easeFactor, repetitions, nextReviewDate
					},
				}),
			]);

			return {
				isCorrect: gradingResult.isCorrect,
				feedback: gradingResult.feedback,
				updatedWordSrs: {
					// Return updated SRS data if needed by frontend
					interval: updatedWord.interval,
					easeFactor: updatedWord.easeFactor,
					repetitions: updatedWord.repetitions,
					nextReviewDate: updatedWord.nextReviewDate,
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
		const userId = ctx.session.user.id;

		const session = await ctx.prisma.practiceSession.findUnique({
			where: { id: practiceSessionId, userId }, // Ensure session belongs to user
			include: {
				vocabLogs: true, // Include all logs for this session
			},
		});

		if (!session) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
		}

		if (session.type !== PracticeType.VOCABULARY) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Session is not a vocabulary practice session." });
		}

		const totalWords = session.vocabLogs.length;
		const correctCount = session.vocabLogs.filter((log: WordPracticeLog) => log.isCorrect).length; // Add explicit type for log
		const accuracy = totalWords > 0 ? (correctCount / totalWords) * 100 : 0;

		return {
			sessionId: session.id,
			startTime: session.startTime,
			endTime: session.endTime, // May be null if session interrupted
			totalWords,
			correctCount,
			accuracy: parseFloat(accuracy.toFixed(1)), // Format accuracy
			logs: session.vocabLogs, // Return individual logs if needed
		};
	}),

	startQuickVocabSession: protectedProcedure // New mutation for quick start
		.input(z.void()) // No input needed
		.mutation(async ({ ctx }) => {
			try {
				const session = await ctx.prisma.practiceSession.create({
					data: {
						userId: ctx.session.user.id,
						type: PracticeType.VOCABULARY,
						// No wordBankId is linked for a quick session
					},
				});
				return { practiceSessionId: session.id };
			} catch (error) {
				console.error("Error starting quick vocab session:", error);
				throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to start quick session." });
			}
		}),

	// --- Word Practice History ---
	getWordPracticeHistory: protectedProcedure
		.input(getWordHistorySchema) // Use the new schema
		.query(async ({ ctx, input }) => {
			const { wordId } = input;

			// 1. Verify the word exists and belongs to the user
			const word = await ctx.prisma.word.findUnique({
				where: { id: wordId },
				select: { id: true, wordBank: { select: { userId: true } } },
			});

			if (!word || word.wordBank.userId !== ctx.session.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
			}

			// 2. Fetch practice logs for this word
			const history = await ctx.prisma.wordPracticeLog.findMany({
				where: { wordId: wordId },
				orderBy: { timestamp: "desc" }, // Show most recent first
				select: {
					id: true,
					timestamp: true,
					userSentence: true,
					isCorrect: true,
					aiFeedback: true,
					easeChosen: true,
				},
			});

			return history;
		}),
});
