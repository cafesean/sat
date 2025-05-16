import { env } from "@/env.mjs";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

// Import the Gemini API helper functions

// Helper function to generate a random topic using Gemini API
async function generateRandomTopicWithGemini(): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("AI API not configured");
  }

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL_NAME });
  
  const prompt = `
    Generate a random academic topic suitable for an SAT reading passage.
    The topic should be specific enough to generate a focused passage but broad enough to allow for multiple questions.
    Examples: "The History of Antibiotics", "Coral Reef Ecosystems", "The Impact of Social Media on Political Discourse"
    
    Return only the topic title as plain text, without quotes or additional formatting.
  `;
  
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 256
    },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ]
  });
  
  return result.response.text().trim();
}

export const readingWritingRouter = router({
  startReadingWritingSession: protectedProcedure
    .input(z.object({
      questionSetId: z.string(),
      difficulty: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { questionSetId, difficulty } = input;
      const userId = ctx.session.user.id;

      // Verify question set exists and belongs to user
      const questionSet = await ctx.prisma.questionSet.findUnique({
        where: { id: questionSetId },
        include: { passages: true }
      });

      if (!questionSet || questionSet.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question set not found" });
      }

      // Create new practice session linked to question set
      const session = await ctx.prisma.practiceSession.create({
        data: {
          userId,
          type: "READING_WRITING",
          difficulty: difficulty || 2, // Default to medium difficulty
          questionSetId: questionSetId,
          passage: questionSet.passages && questionSet.passages.length > 0 ? {
            connect: { id: questionSet.passages[0].id }
          } : undefined
        },
        include: {
          passage: {
            include: {
              questions: true
            }
          }
        }
      });

      return { session };
    }),

  addPassage: protectedProcedure
    .input(z.object({
      questionSetId: z.string(),
      content: z.string().min(1, "Passage content cannot be empty"),
      difficulty: z.number().int().min(1).default(2),
    }))
    .mutation(async ({ ctx, input }) => {
      const { questionSetId, content, difficulty } = input;
      const userId = ctx.session.user.id;

      // Verify question set exists and belongs to user
      const questionSet = await ctx.prisma.questionSet.findUnique({
        where: { id: questionSetId },
      });

      if (!questionSet || questionSet.userId !== userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question set not found" });
      }

      // Create new passage
      const passage = await ctx.prisma.passage.create({
        data: {
          content,
          difficulty,
          questionSet: {
            connect: { id: questionSetId }
          },
        },
      });

      return passage;
    }),

  generateRandomTopic: protectedProcedure
    .mutation(async () => {
      return generateRandomTopicWithGemini();
    }),

  createQuestionSet: protectedProcedure
    .input(z.object({
      topic: z.string().min(1, "Topic cannot be empty"),
    }))
    .mutation(async ({ ctx, input }) => {
      const questionSet = await ctx.prisma.questionSet.create({
        data: {
          topic: input.topic,
          userId: ctx.session.user.id,
        },
      });
      return questionSet;
    }),

  listQuestionSets: protectedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const questionSets = await ctx.prisma.questionSet.findMany({
        where: { userId: ctx.session.user.id },
      });
      return { questionSets };
    }),
  
  submitAnswerAttempt: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      questionId: z.string(),
      selectedAnswer: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify session exists and belongs to user
      const session = await ctx.prisma.practiceSession.findUnique({
        where: { id: input.sessionId },
        include: { passage: { include: { questions: true } } },
      });

      if (!session || session.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      // Find the question
      const question = session.passage?.questions.find(q => q.id === input.questionId);
      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }

      // Check if answer is correct
      const isCorrect = question.correctAnswer === input.selectedAnswer;

      // Create answer attempt record
      const answerAttempt = await ctx.prisma.answerAttempt.create({
        data: {
          practiceSessionId: input.sessionId,
          questionId: input.questionId,
          userId: ctx.session.user.id,
          selectedAnswer: input.selectedAnswer,
          isCorrect,
        },
      });

      return { isCorrect, answerAttemptId: answerAttempt.id };
    }),
  
  getQuestionSet: protectedProcedure
    .input(z.object({ questionSetId: z.string() }))
    .query(async ({ ctx, input }) => {
      const questionSet = await ctx.prisma.questionSet.findUnique({
        where: { id: input.questionSetId },
        include: { passages: true },
      });

      if (!questionSet || questionSet.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question set not found" });
      }

      return questionSet;
    }),
});
