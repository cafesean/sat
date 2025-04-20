import { adminRouter } from "./routers/admin"; // Import admin router
import { authRouter } from "./routers/auth"; // Import the new auth router
import { groupRouter } from "./routers/group"; // Import the new group router
import { notificationRouter } from "./routers/notification";
import { readingWritingRouter } from "./routers/readingWriting";
import { userRouter } from "./routers/user";
import { vocabRouter } from "./routers/vocab";
import { wordBankRouter } from "./routers/wordbank";
import { router } from "./trpc";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = router({
  auth: authRouter, // Add the auth router
  user: userRouter,
  vocab: vocabRouter,
  admin: adminRouter, // Add admin router
  group: groupRouter, // Add the group router
  readingWriting: readingWritingRouter,
  wordBank: wordBankRouter, // Add word bank router
  notification: notificationRouter, // Add notification router
});

// Export type definition of API
export type AppRouter = typeof appRouter;
