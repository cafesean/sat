import { userRouter } from "./routers/user";
import { vocabRouter } from "./routers/vocab";
import { router } from "./trpc";
// Import other routers here as they are created
// import { readingWritingRouter } from './routers/readingWriting'

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = router({
  user: userRouter,
  vocab: vocabRouter, // Add later
  // readingWriting: readingWritingRouter, // Add later
});

// Export type definition of API
export type AppRouter = typeof appRouter
