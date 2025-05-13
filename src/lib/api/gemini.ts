import { env } from "@/env.mjs";
import { ContentSet, ContentSetSchema } from "@/schemas/readingWriting.schema";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { z } from "zod";

// Configuration for content generation
const generationConfig = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 4096, // Increased token limit for R&W content
};

// Initialize Gemini API client
const initGeminiClient = () => {
  if (!env.GEMINI_API_KEY) return null;
  return new GoogleGenerativeAI(env.GEMINI_API_KEY);
};

// Safety settings for Gemini API
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Detects if we're running on the server
 */
const isServer = () => typeof window === 'undefined';

/**
 * Helper function to clean markdown formatting from JSON responses
 */
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json|js|javascript)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  return cleaned;
}

/**
 * Generates a batch of R&W content sets using Gemini.
 * @param difficultyLevel The target difficulty level for the content.
 * @param numberOfSets The number of content sets to generate.
 * @returns A promise that resolves to an array of generated content sets or null if an error occurs.
 */
export async function generateRwContentSets(
  difficultyLevel: number,
  numberOfSets: number
): Promise<ContentSet[] | null> {
  if (!env.GEMINI_API_KEY) return null;

  const prompt = `
    Generate ${numberOfSets} SAT-style Reading & Writing content sets at difficulty level ${difficultyLevel}.
    Each set must include:
    1. A reading passage.
    2. 5-10 multiple-choice questions related to the passage.
    3. For each question:
       - The question text.
       - An array of answer options (at least 4).
       - The correct answer text.
       - A detailed explanation for the correct answer.
       - A strategic tip for approaching this type of question during review.

    Provide the response as a JSON array of objects, where each object represents a content set and matches the following structure:
    [{
      "passage": {
        "content": "...",
        "difficulty": ${difficultyLevel}
      },
      "questions": [{
        "questionText": "...",
        "type": "MULTIPLE_CHOICE",
        "options": [{"text": "..."}, {"text": "..."}, ...],
        "correctAnswer": "...",
        "explanation": "...",
        "strategyTip": "..."
      }, ...]
    }, ...]

    Ensure the content is appropriate for SAT preparation and the specified difficulty level.
    Provide only the JSON array.
  `;

  try {
    let responseText;
    if (isServer()) {
      const genAI = initGeminiClient();
      if (!genAI) return null;
      const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL_NAME });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
      });
      responseText = result.response.text().trim();
    } else {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, generationConfig }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      responseText = data.response;
    }
    const cleaned = cleanJsonResponse(responseText);
    try {
      const parsed = JSON.parse(cleaned);
      const validated = z.array(ContentSetSchema).parse(parsed);
      return validated;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}
