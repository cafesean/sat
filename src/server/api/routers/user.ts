import { protectedProcedure, router } from '../trpc';

export const userRouter = router({
  // Example protected procedure
  getProfile: protectedProcedure.query(({ ctx }) => {
    // ctx.session.user is guaranteed to be non-null here due to protectedProcedure
    return {
      id: ctx.session.user.id,
      name: ctx.session.user.name,
      email: ctx.session.user.email,
      image: ctx.session.user.image,
      // You could potentially fetch more user data from the DB here if needed
      // using ctx.prisma.user.findUnique(...)
    }
  }),

  getWordBankCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const wordBankCount = await ctx.prisma.wordBank.count({
      where: {
        userId: userId,
      },
    });
    return { count: wordBankCount };
  }),

  getUserProgressSummary: protectedProcedure.query(({ ctx }) => {
    // Placeholder for fetching user progress summary
    // This would involve querying practice sessions, word practice logs, etc.
    // For now, return a placeholder message
    return {
      message: "Progress summary data will be available here.",
      // Example structure (to be implemented later):
      // totalWordsLearned: 0,
      // upcomingReviews: 0,
      // recentActivity: [],
    };
  }),
})
