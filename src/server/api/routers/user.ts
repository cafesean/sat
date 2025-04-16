import { uploadToS3 } from '@/lib/storage';
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
        file: z.string(), // Expecting a Base64 string instead of a File object
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const base64Data = input.file.split(",")[1]; // Extract the Base64 data
      const fileExt = "png"; // Default to PNG or infer from Base64 if needed
      const fileName = `${input.userId}.${fileExt}`;

      const { url } = await uploadToS3({
        file: new File([Buffer.from(base64Data, "base64")], fileName, { type: `image/${fileExt}` }), // Convert Base64 to File
        fileName,
        folder: "avatars",
      });

      const updatedUser = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { image: url },
      });

      return updatedUser;
    }),
})
