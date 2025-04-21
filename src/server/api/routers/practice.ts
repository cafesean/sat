import { PracticeType } from "@/schemas/practice.schema";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const practiceRouter = router({
  startPracticeSession: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        wordBankId: z.string().cuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.practiceSession.create({
        data: {
          userId: input.userId,
          type: PracticeType.VOCABULARY,
          wordBankId: input.wordBankId,
        },
      });
      return session;
    }),

  endPracticeSession: protectedProcedure
    .input(z.object({ sessionId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.practiceSession.update({
        where: { id: input.sessionId },
        data: { endTime: new Date() },
      });
      return session;
    }),

  getPrioritizedWords: protectedProcedure
    .input(
      z.object({
        wordBankId: z.string().cuid().optional(),
        sessionId: z.string().cuid().optional(),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get words due for review, prioritizing those with lowest intervals
      const words = await ctx.prisma.word.findMany({
        where: {
          wordBankId: input.wordBankId,
          nextReviewDate: { lte: new Date() },
        },
        orderBy: [
          { interval: "asc" }, // Words with lowest intervals first
          { nextReviewDate: "asc" }, // Then oldest due dates
        ],
        take: input.limit,
        include: {
          wordMaster: true,
        },
      });
      return words;
    }),
});