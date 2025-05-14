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
      { category: HarmCategory.HARMCATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARMCATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARMCATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARMCATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Question Set not found" });
      }

      // Create new practice session linked to question set
      const session = await ctx.prisma.practiceSession.create({
        data: {
          userId,
          type: "READING_WRITING",
          difficulty: difficulty || 2, // Default to medium difficulty
          questionSetId: questionSetId,
          passage: questionSet.passages.length > 0 ? {
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
    }))
    .mutation(async ({ ctx, input }) => {
      const { questionSetId, content } = input;
      const userId = ctx.session.user.id;

      // Verify question set exists and belongs to user
      const questionSet = await ctx.prisma.questionSet.findUnique({
        where: { id: questionSetId },
      });

      if (!questionSet || questionSet.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question Set not found",
        });
      }

      // Create passage linked to question set
      const createdPassage = await ctx.prisma.passage.create({
        data: {
          content,
          difficulty: 2, // default difficulty
          questionSet: {
            connect: { id: questionSetId },
          },
        },
      });

      return createdPassage;
    }),

  generateRandomTopic: protectedProcedure // Changed to protectedProcedure as per root.ts context
    .mutation(async () => {
      try {
        const topic = await generateRandomTopicWithGemini();
        return topic;
      } catch (error) {
        console.error("Error generating random topic:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate topic",
        });
      }
    }),

  createQuestionSet: protectedProcedure // Added createQuestionSet procedure
    .input(z.object({
      topic: z.string().min(1, "Topic cannot be empty"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { topic } = input;
      const userId = ctx.session.user.id;

      const newQuestionSet = await ctx.prisma.questionSet.create({
        data: {
          title: topic,
          userId: userId,
        },
      });

      return newQuestionSet;
    }),

  // ... other existing procedures ...
});
