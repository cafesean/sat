import { registerSchema } from '@/schemas/auth.schema';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { publicProcedure, router } from '../trpc';

export const authRouter = router({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, password, name } = input;

      const existingUser = await ctx.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        // If user exists and already has a password, throw conflict
        if (existingUser.hashedPassword) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An account with this email already exists.',
          });
        }
        // If user exists but doesn't have a password (magic link user), we can proceed to set one
        // Note: This flow assumes we want to allow magic link users to set a password later.
        // If not, the logic would just be the CONFLICT error above.
      }

      const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10

      try {
        if (existingUser) {
          // Update existing magic-link user with password
          await ctx.prisma.user.update({
            where: { email },
            data: { hashedPassword },
          });
          console.log(`Password set for existing user: ${email}`);
        } else {
          // Create new user
          await ctx.prisma.user.create({
            data: {
              email,
              hashedPassword,
              name,
            },
          });
          console.log(`New user registered: ${email}`);
        }
        return { success: true };
      } catch (error) {
        console.error("Error during registration/password setup:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to register user.',
          cause: error,
        });
      }
    }),
});
