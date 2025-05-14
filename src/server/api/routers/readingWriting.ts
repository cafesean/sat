import { env } from "@/env.mjs";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { router } from "../trpc";

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
  // Removed procedures related to QuestionSet as the model does not exist in the schema.
  // startReadingWritingSession: protectedProcedure
  //   .input(z.object({
  //     questionSetId: z.string(),
  //     difficulty: z.number().optional(),
  //   }))
  //   .mutation(async ({ ctx, input }) => {
  //     // ... implementation ...
  //   }),

  // addPassage: protectedProcedure
  //   .input(z.object({
  //     questionSetId: z.string(),
  //     content: z.string().min(1, "Passage content cannot be empty"),
  //   }))
  //   .mutation(async ({ ctx, input }) => {
  //     // ... implementation ...
  //   }),

  // generateRandomTopic: protectedProcedure
  //   .mutation(async () => {
  //     // ... implementation ...
  //   }),

  // createQuestionSet: protectedProcedure
  //   .input(z.object({
  //     topic: z.string().min(1, "Topic cannot be empty"),
  //   }))
  //   .mutation(async ({ ctx, input }) => {
  //     // ... implementation ...
  //   }),

  // listQuestionSets: protectedProcedure
  //   .input(z.object({}))
  //   .query(async ({ ctx, input }) => {
  //     // ... implementation ...
  //   }),

  // Add other existing procedures here if they don't rely on QuestionSet
});
