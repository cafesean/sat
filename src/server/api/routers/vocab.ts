import { enrichWord } from "@/lib/api/gemini";
import { calculateNextReview } from "@/lib/srs/sm2";
import {
  getNextVocabWordSchema,
  getVocabSessionSummarySchema,
  startVocabSessionSchema,
  submitVocabAnswerSchema,
} from "@/schemas/practice.schema";
// Import Prisma types correctly
import { PracticeType, WordPracticeLog } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const vocabRouter = router({
  // --- Word Bank CRUD (Placeholder - Implement later based on Sprint 2) ---
  createWordBank: protectedProcedure
    .input(z.object({ name: z.string(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Placeholder
      console.log("Creating word bank:", input);
      return { id: "mock-bank-id", ...input };
    }),
  listWordBanks: protectedProcedure.query(async ({ ctx }) => {
    // Placeholder
    console.log("Listing word banks for user:", ctx.session.user.id);
    return [
      { id: "bank1", name: "SAT Common Words", description: "Frequently used SAT words" },
      { id: "bank2", name: "Advanced Vocab", description: "Challenging words" },
    ];
  }),
  // ... other word bank CRUD operations ...

  // --- Add Words ---
  addBatch: protectedProcedure
    .input(
      z.object({
        wordBankId: z.string(),
        words: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Ensure word bank exists and belongs to user (add check later)
      try {
        const wordsWithData = await Promise.all(
          input.words.map(async (word) => {
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

  startVocabSession: protectedProcedure
    .input(startVocabSessionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const session = await ctx.prisma.practiceSession.create({
          data: {
            userId: ctx.session.user.id,
            type: PracticeType.VOCABULARY,
            // We don't link specific word banks here,
            // we'll filter words based on input banks in getNextVocabWord
          },
        });
        return { practiceSessionId: session.id };
      } catch (error) {
        console.error("Error starting vocab session:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to start session." });
      }
    }),

  getNextVocabWord: protectedProcedure
    .input(getNextVocabWordSchema)
    .query(async ({ ctx, input }) => {
      const { practiceSessionId } = input;
      const userId = ctx.session.user.id;

      // Find words belonging to the user that are due for review
      // This requires knowing which word banks were selected initially.
      // For now, let's assume we fetch from ALL user's words.
      // A better approach would store selected bank IDs in PracticeSession or pass them here.
      // We also need to exclude words already practiced in this session.

      const practicedWordIds = (
        await ctx.prisma.wordPracticeLog.findMany({
          where: { practiceSessionId },
          select: { wordId: true },
        })
      ).map((log: { wordId: string }) => log.wordId); // Add explicit type for log

      const nextWord = await ctx.prisma.word.findFirst({
        where: {
          wordBank: {
            userId: userId, // Ensure word belongs to the user
          },
          nextReviewDate: {
            lte: new Date(), // Word is due
          },
          id: {
            notIn: practicedWordIds, // Exclude already practiced words in this session
          }
        },
        orderBy: {
          nextReviewDate: 'asc', // Prioritize oldest due words
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

  submitVocabAnswer: protectedProcedure
    .input(submitVocabAnswerSchema)
    .mutation(async ({ ctx, input }) => {
      const { practiceSessionId, wordId, userSentence, easeChosen } = input;
      const userId = ctx.session.user.id;

      try {
        // 1. Fetch the word to get its text for grading
        const word = await ctx.prisma.word.findUnique({
          where: { id: wordId },
        });

        if (!word) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Word not found." });
        }
        // Ensure word belongs to user (implicit via session check later?)

        // 2. Call the grading API endpoint
        let gradingResult: { isCorrect: boolean; feedback: string };
        try {
          // Construct the absolute URL for the API endpoint
          // Note: In a real deployment, use env variables for the base URL
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const gradeApiUrl = new URL('/api/grade-sentence', baseUrl);

          const response = await fetch(gradeApiUrl.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Pass necessary auth info if endpoint requires it beyond session cookie
              // e.g., 'Authorization': `Bearer ${ctx.session.accessToken}`
            },
            body: JSON.stringify({ word: word.text, sentence: userSentence }),
          });

          if (!response.ok) {
             const errorBody = await response.text();
             console.error(`Grading API call failed with status ${response.status}:`, errorBody);
             throw new Error(`Grading API call failed: ${response.statusText}`);
          }
          gradingResult = await response.json();

          // Validate the structure of the grading result
          if (typeof gradingResult?.isCorrect !== 'boolean' || typeof gradingResult?.feedback !== 'string') {
            console.error('Invalid response structure from grading API:', gradingResult);
            throw new Error('Invalid response structure from grading API.');
          }

        } catch (apiError) {
           console.error("Error calling grading API:", apiError);
           // Provide default feedback if API call fails
           gradingResult = { isCorrect: false, feedback: "Could not get AI feedback at this time." };
           // Optionally re-throw or handle differently if grading is critical
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
              userId, // Log who practiced
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
          updatedWordSrs: { // Return updated SRS data if needed by frontend
            interval: updatedWord.interval,
            easeFactor: updatedWord.easeFactor,
            repetitions: updatedWord.repetitions,
            nextReviewDate: updatedWord.nextReviewDate,
          }
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
        const accuracy = totalWords > 0 ? correctCount / totalWords * 100 : 0;

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

});
