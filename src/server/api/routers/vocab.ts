import { enrichWord, gradeSentence } from "@/lib/api/gemini";
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
	toggleWordStarSchema,

	updateWordSchema,
	wordBankSchema
} from "@/schemas/vocab.schema";
import { PracticeType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const vocabRouter = router({
	// --- Word Bank CRUD ---
	createWordBank: protectedProcedure
		.input(wordBankSchema)
		.mutation(async ({ ctx, input }) => {
			console.log("Validated input received by createWordBank:", input);
			try {
				const newWordBank = await ctx.prisma.wordBank.create({
					data: {
						name: input.name,
						description: input.description,
						userId: ctx.session.user.id,
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
					words: { select: { interval: true } },
				},
				orderBy: { createdAt: "desc" },
			});
			const wordBanksWithMastery = wordBanks.map((bank) => {
				const totalWords = bank.words.length;
				if (totalWords === 0) {
					return { ...bank, wordCount: 0, masteryPercentage: 0 };
				}
				const masteredCount = bank.words.filter((word) => word.interval > 30).length;
				const masteryPercentage = Math.round((masteredCount / totalWords) * 100);
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
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const wordBank = await ctx.prisma.wordBank.findUnique({
				where: { id: input.id, userId: ctx.session.user.id },
			});
			if (!wordBank) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found." });
			}
			return wordBank;
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
					id: true, text: true, definition: true, sampleSentence: true,
					translation: true, interval: true, createdAt: true, updatedAt: true,
					wordBankId: true, easeFactor: true, repetitions: true, nextReviewDate: true,
					isStarred: true,
					_count: {
						select: { practiceLogs: true }
					}
				},
				orderBy: { createdAt: "asc" },
			});
			return words;
		}),

	updateWord: protectedProcedure
		.input(updateWordSchema)
		.mutation(async ({ ctx, input }) => {
			const { wordId, text } = input;
			const word = await ctx.prisma.word.findUnique({
				where: { id: wordId },
				select: { wordBank: { select: { userId: true } } },
			});
			if (!word || word.wordBank.userId !== ctx.session.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
			}
			const updatedWord = await ctx.prisma.word.update({
				where: { id: wordId }, data: { text: text },
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
			const words = input.wordsText.split(/\s*[\n,]\s*/).map(w => w.trim()).filter(w => w.length > 0);
			if (words.length === 0) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "No valid words found in the input." });
			}
			try {
				const wordsWithData = await Promise.all(
					words.map(async (word) => {
						const enrichedData = await enrichWord(word);
						return {
							text: word,
							wordType: enrichedData?.wordType,
							definition: enrichedData?.definition,
							sampleSentence: enrichedData?.sampleSentence,
							translation: enrichedData?.translation,
						};
					})
				);
				await ctx.prisma.word.createMany({
					data: wordsWithData.map((wd) => ({ ...wd, wordBankId: input.wordBankId })),
					skipDuplicates: true,
				});
				return { success: true, count: wordsWithData.length };
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
				select: { wordBankId: true },
			});
			if (!session) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Practice session not found." });
			}

			const practicedWordIds = (await ctx.prisma.wordPracticeLog.findMany({
				where: { practiceSessionId }, select: { wordId: true },
			})).map(log => log.wordId);

			const whereClause: any = {
				nextReviewDate: { lte: new Date() },
				id: { notIn: practicedWordIds },
			};

			if (session.wordBankId) {
				whereClause.wordBankId = session.wordBankId;
			} else {
				whereClause.wordBank = { userId: userId };
			}

			const nextWord = await ctx.prisma.word.findFirst({
				where: whereClause,
				orderBy: { nextReviewDate: "asc" },
			});

			return nextWord;
		}),

	submitVocabAnswer: protectedProcedure
		.input(submitVocabAnswerSchema)
		.mutation(async ({ ctx, input }) => {
			const { practiceSessionId, wordId, userSentence, easeChosen } = input;
			const userId = ctx.session.user.id;

			try {
				const word = await ctx.prisma.word.findUnique({ where: { id: wordId } });

				if (!word) {
					throw new TRPCError({ code: "NOT_FOUND", message: "Word not found." });
				}

				const userGradeLevel = ctx.session.user.gradeLevel;

				let gradingResult: { isCorrect: boolean; feedback: string };
				try {
					const aiResult = await gradeSentence(word.text, userSentence);
					if (aiResult === null || typeof aiResult.isCorrect !== 'boolean' || typeof aiResult.feedback !== 'string') {
						console.error("Invalid response structure from /api/grade-sentence:", aiResult);
						throw new Error("Invalid response structure from AI grading service.");
					}
					gradingResult = aiResult;
				} catch (apiError: any) { // Catch specific error type if possible
					console.error("Error calling /api/grade-sentence:", apiError);
					gradingResult = { isCorrect: false, feedback: `Could not get AI feedback: ${apiError.message}` }; // Include error message
				}

				const srsUpdate = calculateNextReview(word, easeChosen);

				const [, updatedWord] = await ctx.prisma.$transaction([
					ctx.prisma.wordPracticeLog.create({
						data: { practiceSessionId, wordId, userSentence, isCorrect: gradingResult.isCorrect, aiFeedback: gradingResult.feedback, easeChosen },
					}),
					ctx.prisma.word.update({ where: { id: wordId }, data: { ...srsUpdate } }),
				]);

				return {
					isCorrect: gradingResult.isCorrect,
					feedback: gradingResult.feedback,
					updatedWordSrs: { interval: updatedWord.interval, easeFactor: updatedWord.easeFactor, repetitions: updatedWord.repetitions, nextReviewDate: updatedWord.nextReviewDate },
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
						include: {
							word: {
								select: { text: true }
							}
						}
					}
				},
			});
			if (!session) { throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." }); }
			if (session.type !== PracticeType.VOCABULARY) { throw new TRPCError({ code: "BAD_REQUEST", message: "Session is not a vocabulary practice session." }); }

			const totalWords = session.vocabLogs.length;
			const correctCount = session.vocabLogs.filter(log => log.isCorrect).length;
			const accuracy = totalWords > 0 ? (correctCount / totalWords) * 100 : 0;

			return {
				sessionId: session.id, startTime: session.startTime, endTime: session.endTime,
				totalWords, correctCount, accuracy: parseFloat(accuracy.toFixed(1)),
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
			const sessions = items.map(s => ({
				id: s.id, startTime: s.startTime, endTime: s.endTime,
				wordBankId: s.wordBankId,
				wordBankName: s.wordBank?.name ?? null,
				wordsStudied: s._count.vocabLogs,
				accuracy: s.score ?? 0,
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

	// --- Get Word Hint ---
	getWordHint: protectedProcedure
		.input(z.object({ wordId: z.string().cuid() }))
		.query(async ({ ctx, input }) => {
			const { wordId } = input;
			const wordWithOwnerCheck = await ctx.prisma.word.findUnique({
				where: {
					id: wordId,
					wordBank: {
						userId: ctx.session.user.id
					}
				},
				select: {
					id: true,
					wordType: true,
					definition: true,
					sampleSentence: true,
					translation: true,
				}
			});

			if (!wordWithOwnerCheck) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Word not found or access denied." });
			}

			const { id, ...hintData } = wordWithOwnerCheck;
			return hintData;
		}),
});
