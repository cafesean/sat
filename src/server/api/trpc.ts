/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson'; // Use superjson for data serialization
import { type Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson, // Enable superjson transformer
  errorFormatter({ shape }) {
    return shape
  },
})

/**
 * Reusable middleware to ensure
 * users are logged in
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router
export const publicProcedure = t.procedure

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/v11/procedures
 */
export const protectedProcedure = t.procedure.use(isAuthed)
