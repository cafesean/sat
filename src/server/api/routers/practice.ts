import { z } from "zod";
import { Prisma } from "@prisma/client";
import { checkWordBankAccess } from "./vocab";
import { router, protectedProcedure } from "../trpc";
import { prioritizeWordsFrequency } from "@/lib/srs/frequencyBased";

// Type that exactly matches our database schema for Word
type WordForPrioritization = {
  id: string;
  text: string;
  mastery: number;
  nextDueAtReviewCount: number;
  timesSeen: number;
  successRate: number;
  isStarred: boolean;
  wordMaster?: any;
  // Optional additional fields for the prioritization algorithm
  priorityScore?: number;
};

export const practiceRouter = router({
  // Start a new practice session
  startPracticeSession: protectedProcedure
    .input(
      z.object({
        wordBankId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.practiceSession.create({
        data: {
          userId: ctx.session.user.id,
          wordBankId: input.wordBankId,
          type: "VOCABULARY", // Required by schema
        },
      });
      return session;
    }),

  endPracticeSession: protectedProcedure
    .input(z.object({ sessionId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.practiceSession.update({
        where: { id: input.sessionId },
        data: { 
          endTime: new Date(),
          // Use Prisma.DbNull for type safety
          lastFetchedWordId: null as unknown as Prisma.NullTypes.DbNull,
        },
      });
      return session;
    }),

  getPrioritizedWords: protectedProcedure
    .input(
      z.object({
        wordBankId: z.string().cuid().optional(),
        sessionId: z.string().cuid().optional(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(), // Add cursor for pagination
      })
    )
    .query(async ({ ctx, input }) => {
      // Find the last fetched word ID from the session if not explicitly provided
      let cursorId = input.cursor;
      
      if (input.sessionId && !cursorId) {
        // Use raw query to access the custom field
        const sessions = await ctx.prisma.$queryRaw<{id: string, lastFetchedWordId: string | null}[]>`
          SELECT id, "lastFetchedWordId" 
          FROM "PracticeSession" 
          WHERE id = ${input.sessionId}
        `;
        
        if (sessions && sessions.length > 0) {
          cursorId = sessions[0].lastFetchedWordId || undefined;
        }
      }
      
      // Get the current reviewCount for the wordBank
      const wordBank = input.wordBankId 
        ? await ctx.prisma.wordBank.findUnique({
            where: { id: input.wordBankId },
            select: { reviewCount: true }
          })
        : null;
      
      const currentReviewCount = wordBank?.reviewCount || 0;
      
      // Get words due for review
      let words = await ctx.prisma.word.findMany({
        where: {
          wordBankId: input.wordBankId,
          nextDueAtReviewCount: { lte: currentReviewCount },
        },
        select: {
          id: true,
          text: true,
          mastery: true,
          nextDueAtReviewCount: true,
          timesSeen: true,
          successRate: true,
          isStarred: true,
          wordMaster: true,
        },
        take: input.limit * 2, // Get more than we need for sorting
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      });
      
      // If no words are due, get any words from this bank
      if (words.length === 0 && input.wordBankId) {
        words = await ctx.prisma.word.findMany({
          where: { wordBankId: input.wordBankId },
          select: {
            id: true,
            text: true,
            mastery: true,
            nextDueAtReviewCount: true,
            timesSeen: true,
            successRate: true,
            isStarred: true,
            wordMaster: true,
          },
          take: input.limit * 2,
        });
      }
      
      // Convert to the format expected by prioritizeWordsFrequency
      const wordsForPrioritization = words.map(word => ({
        id: word.id,
        text: word.text || "",
        mastery: word.mastery,
        nextDueAtReviewCount: word.nextDueAtReviewCount,
        timesSeen: word.timesSeen,
        successRate: word.successRate,
        isStarred: word.isStarred,
        wordMaster: word.wordMaster
      }));
      
      // Sort words using our frequency-based prioritization
      const prioritizedWords = prioritizeWordsFrequency(wordsForPrioritization, currentReviewCount);
      
      // Limit to requested number
      const limitedWords = prioritizedWords.slice(0, input.limit);
      
      // Update the session with the last fetched word ID if sessionId was provided and words were found
      if (input.sessionId && limitedWords.length > 0) {
        const lastWord = limitedWords[limitedWords.length - 1];
        
        // Use raw query to update the custom field
        await ctx.prisma.$executeRaw`
          UPDATE "PracticeSession"
          SET "lastFetchedWordId" = ${lastWord.id}
          WHERE id = ${input.sessionId}
        `;
      }
      
      return limitedWords;
    }),

  // Toggle star status on a word during practice
  toggleStar: protectedProcedure
    .input(
      z.object({
        wordId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch the word with its current star status and bank ID
      const word = await ctx.prisma.word.findUnique({
        where: { id: input.wordId },
        select: { 
          id: true,
          isStarred: true,
          wordBankId: true,
        },
      });

      if (!word) {
        throw new Error("Word not found");
      }

      // Check if user has access to this word's bank
      const { hasAccess } = await checkWordBankAccess(ctx.prisma, ctx.session.user.id, word.wordBankId);
      if (!hasAccess) {
        throw new Error("Access denied to this word's bank");
      }

      // Toggle the star status
      const updatedWord = await ctx.prisma.word.update({
        where: { id: input.wordId },
        data: { isStarred: !word.isStarred },
        select: { id: true, isStarred: true }
      });

      return updatedWord;
    }),
});