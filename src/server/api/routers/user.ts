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

  // Add other user-related procedures here later
})
