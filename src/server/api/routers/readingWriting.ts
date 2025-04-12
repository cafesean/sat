import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
// Import necessary schemas, services, types later

export const readingWritingRouter = router({
  // Placeholder - Implement procedures in subsequent steps
  startSession: protectedProcedure
    .input(z.object({ difficulty: z.number().min(1).max(5) })) // Placeholder input
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement AI generation call and DB creation
      console.log('Starting Reading & Writing session with difficulty:', input.difficulty);
      // Placeholder response
      return { sessionId: 'rw-session-placeholder-id' };
    }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() })) // Placeholder input
    .query(async ({ ctx, input }) => {
      // TODO: Implement fetching session, passage, and questions
      console.log('Fetching Reading & Writing session:', input.sessionId);
      // Placeholder response
      return {
        id: input.sessionId,
        type: 'READING_WRITING',
        passage: { content: 'Placeholder passage text...' },
        questions: [
          { id: 'q1', questionText: 'Placeholder question 1?', options: ['A', 'B', 'C', 'D'] },
        ],
      };
    }),

  // Add submitAnswers mutation later
});
