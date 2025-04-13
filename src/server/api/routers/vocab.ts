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
	updateWordNotesSchema, // Add schema import
	updateWordSchema,
	wordBankSchema
} from "@/schemas/vocab.schema";
import { PracticeType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

// Vocab Router
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
					id: true,
					text: true,
					interval: true,
					easeFactor: true,
					repetitions: true,
					nextReviewDate: true,
					isStarred: true,
					notes: true,
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

			// Transform the result to match the WordListItem type
			return words.map(word => ({
				id: word.id,
				text: word.text,
				interval: word.interval,
				easeFactor: word.easeFactor,
				repetitions: word.repetitions,
				nextReviewDate: word.nextReviewDate,
				isStarred: word.isStarred,
				notes: word.notes,
				wordBankId: word.wordBank.id,
				wordMaster: word.wordMaster,
				practiceCount: word._count.practiceLogs
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
				const wordRecords = await Promise.all(
					words.map(async (wordText) => {
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
					data: wordRecords.map((wr, index) => ({
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
