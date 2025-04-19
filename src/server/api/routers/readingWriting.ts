import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const readingWritingRouter = router({
  startReadingWritingSession: protectedProcedure
    .input(z.object({
      wordBankId: z.string().optional(),
      difficulty: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { wordBankId, difficulty } = input;
      const userId = ctx.session.user.id;

      // Create new practice session
      const session = await ctx.prisma.practiceSession.create({
        data: {
          userId,
          type: "READING_WRITING",
          wordBankId,
          difficulty
        }
      });

      return { session };
    }),

  submitAnswerAttempt: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      questionId: z.string(),
      selectedAnswer: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, questionId, selectedAnswer } = input;
      const userId = ctx.session.user.id;

      // Get question to check answer
      const question = await ctx.prisma.question.findUnique({
        where: { id: questionId },
        include: { passage: true }
      });

      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }

      // Verify session exists and belongs to user
      const session = await ctx.prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid session" });
      }

      // Check if answer is correct
      const isCorrect = selectedAnswer === question.correctAnswer;

      // Create answer attempt
      const attempt = await ctx.prisma.answerAttempt.create({
        data: {
          practiceSessionId: sessionId,
          questionId,
          userId,
          selectedAnswer,
          isCorrect
        }
      });

      return { attempt, isCorrect };
    }),

  getReadingWritingSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { sessionId } = input;
      const userId = ctx.session.user.id;

      const session = await ctx.prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: {
          passage: {
            include: {
              questions: true
            }
          },
          answerAttempts: true
        }
      });

      if (!session || session.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid session" });
      }

      return session;
    }),

  generatePassageAndQuestions: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      topic: z.string().optional(),
      difficulty: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, topic, difficulty } = input;
      const userId = ctx.session.user.id;

      // Verify session exists and belongs to user
      const session = await ctx.prisma.practiceSession.findUnique({
        where: { id: sessionId }
      });

      if (!session || session.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid session" });
      }

      // TODO: Implement Gemini API integration
      // This is a placeholder - actual implementation would call Gemini API
      const generatedPassage = {
        content: "Sample passage about " + (topic || "general knowledge"),
        difficulty: difficulty || 3,
        questions: [
          {
            questionText: "What is the main topic of this passage?",
            type: "MULTIPLE_CHOICE" as const,
            options: ["Option 1", "Option 2", "Option 3", "Option 4"],
            correctAnswer: "Option 1",
            explanation: "The passage clearly focuses on this topic"
          }
        ]
      };

      // Create passage and questions
      const passage = await ctx.prisma.passage.create({
        data: {
          content: generatedPassage.content,
          difficulty: generatedPassage.difficulty,
          practiceSessionId: sessionId,
          questions: {
            create: generatedPassage.questions.map(q => ({
              questionText: q.questionText,
              type: q.type,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation
            }))
          }
        },
        include: {
          questions: true
        }
      });

      return { passage };
    }),

  createQuestionSet: protectedProcedure
    .input(z.object({
      passageId: z.string(),
      questions: z.array(z.object({
        questionText: z.string(),
        type: z.enum(["MULTIPLE_CHOICE"]),
        options: z.array(z.string()),
        correctAnswer: z.string(),
        explanation: z.string().optional()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const { passageId, questions } = input;
      const userId = ctx.session.user.id;

      // Verify passage exists and belongs to user
      const passage = await ctx.prisma.passage.findUnique({
        where: { id: passageId },
        include: { practiceSession: true }
      });

      if (!passage || passage.practiceSession.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid passage" });
      }

      // Create all questions
      const createdQuestions = await ctx.prisma.$transaction(
        questions.map(q =>
          ctx.prisma.question.create({
            data: {
              passageId,
              questionText: q.questionText,
              type: q.type,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation
            }
          })
        )
      );

      return { questions: createdQuestions };
    }),

  shareQuestionSet: protectedProcedure
    .input(z.object({
      passageId: z.string(),
      sharedWithUserId: z.string().optional(),
      sharedWithGroupId: z.string().optional(),
      generateShareLink: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { passageId, sharedWithUserId, sharedWithGroupId, generateShareLink } = input;
      const userId = ctx.session.user.id;

      // Verify passage exists and belongs to user
      const passage = await ctx.prisma.passage.findUnique({
        where: { id: passageId },
        include: { practiceSession: true }
      });

      if (!passage || passage.practiceSession.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid passage" });
      }

      // TODO: Implement sharing logic similar to wordBankRouter.shareWordBank
      // This would involve creating a SharedQuestionSet model in Prisma schema
      throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "Sharing not yet implemented" });
    }),

  getSharedQuestionSet: protectedProcedure
    .input(z.object({
      sharedQuestionSetId: z.string().optional(),
      shareLink: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      // TODO: Implement retrieval of shared question sets
      throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "Not yet implemented" });
    }),

  copySharedQuestionSet: protectedProcedure
    .input(z.object({
      sharedQuestionSetId: z.string().optional(),
      shareLink: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement copying of shared question sets
      throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "Not yet implemented" });
    }),

  askQuestionAboutPassage: protectedProcedure
    .input(z.object({
      passageId: z.string(),
      question: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { passageId, question } = input;
      const userId = ctx.session.user.id;

      // Verify passage exists and belongs to user
      const passage = await ctx.prisma.passage.findUnique({
        where: { id: passageId },
        include: { practiceSession: true }
      });

      if (!passage || passage.practiceSession.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid passage" });
      }

      // TODO: Implement Gemini API integration for answering questions
      return {
        answer: "This is a sample answer from the AI. The actual implementation would call the Gemini API to generate a response based on the passage content.",
        relevantPassageExcerpt: passage.content.substring(0, 100) + "..."
      };
    })
});
