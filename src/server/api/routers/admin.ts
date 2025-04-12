import { UserRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { protectedProcedure, router } from '../trpc'; // Assuming admin procedures should be protected

// Middleware to check if the user is an ADMIN
const isAdmin = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== UserRole.ADMIN) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Requires admin privileges' })
  }
  return next({
    ctx: {
      // Pass down the context, session is already verified by protectedProcedure
      session: ctx.session,
    },
  })
})

// Define the admin procedure using the isAdmin middleware
const adminProcedure = isAdmin

export const adminRouter = router({
  listUsers: adminProcedure.query(async ({ ctx }) => {
    // Placeholder: Implement logic to fetch users
    console.log('Fetching users for admin:', ctx.session.user?.email ?? 'unknown email') // Added optional chaining
    // Example: Fetch all users, potentially excluding the admin themselves
    const users = await ctx.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      // select: { id: true, name: true, email: true, role: true, createdAt: true } // Select specific fields
    })
    return users
  }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        newRole: z.nativeEnum(UserRole), // Use nativeEnum for Prisma enums
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Placeholder: Implement logic to update user role
      console.log(`Admin ${ctx.session.user?.email ?? 'unknown email'} updating user ${input.userId} to role ${input.newRole}`) // Added optional chaining
      // Prevent admin from changing their own role via this endpoint?
      if (input.userId === ctx.session.user.id) {
         throw new TRPCError({ code: 'BAD_REQUEST', message: 'Admin cannot change their own role here.' })
      }
      const updatedUser = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.newRole },
      })
      return updatedUser
    }),
})
