import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

export const userRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        gradeLevel: true,
        languagePreference: true,
      },
    })
    return user
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50),
        gradeLevel: z.number().min(1).max(16),
        languagePreference: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          name: input.name,
          gradeLevel: input.gradeLevel,
          languagePreference: input.languagePreference,
        },
      })
      return updatedUser
    }),

  updateAvatar: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { image: input.url }
      })
      return updatedUser
    }),
})
