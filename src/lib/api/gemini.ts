import { env } from "@/env.mjs"; // Import validated environment variables
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

// Ensure API key is available
if (!env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. AI features will be disabled.");
}

// Initialize the client only if the API key exists
const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;
const modelName = env.GEMINI_MODEL_NAME; // Get model name from env

// Configuration for content generation (adjust safety settings as needed)
const generationConfig = {
  temperature: 0.7, // Controls randomness (0=deterministic, 1=max random)
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Enriches a word with definition, sample sentence, translation, and word type using Gemini.
 */
export async function enrichWord(
  word: string,
  languagePreference?: string,
  gradeLevel?: number | null
): Promise<{ definition: string; sampleSentence: string; translation: string; wordType: string } | null> {
  if (!genAI) return null; // Return null if API key is missing

  const prompt = `
    For the English word "${word}", provide the following in JSON format:
    1.  "wordType": The primary part of speech (e.g., "noun", "verb", "adjective", "adverb").
    2.  "definition": A concise definition suitable for ${gradeLevel ? `a grade ${gradeLevel} student` : 'an SAT student'}.
    3.  "sampleSentence": A clear sample sentence using the word in context${gradeLevel ? ` at a grade ${gradeLevel} reading level` : ''}.
    4.  "translation": The ${languagePreference || 'Chinese'} translation of the word.

    Example JSON format:
    {
      "wordType": "adjective",
      "definition": "lasting for a very short time",
      "sampleSentence": "The ephemeral beauty of the cherry blossoms lasts only a few weeks.",
      "translation": "短暂的"
    }

    Provide only the JSON object.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    let responseText = result.response.text().trim();
    // Clean the response text: remove potential markdown fences and trim
    responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    try {
      const parsed = JSON.parse(responseText);
      // Check for all four fields now
      if (parsed.wordType && parsed.definition && parsed.sampleSentence && parsed.translation) {
        return {
          wordType: parsed.wordType,
          definition: parsed.definition,
          sampleSentence: parsed.sampleSentence,
          translation: parsed.translation,
        };
      } else {
        console.error("Gemini enrichWord response missing expected fields (wordType, definition, sampleSentence, translation):", responseText);
        return null;
      }
    } catch (parseError) {
      console.error(`Failed to parse Gemini response for word "${word}":`, parseError);
      console.error("Raw response:", responseText);
      return null;
    }
  } catch (error) {
    console.error(`Error enriching word "${word}" with Gemini:`, error);
    return null; // Return null on error
  }
}

/**
 * Grades a user's sentence for correct usage of a given word using Gemini, optionally considering grade level.
 */
export async function gradeSentence(
  word: string,
  sentence: string,
  gradeLevel?: number | null // Optional grade level parameter
): Promise<{ isCorrect: boolean; feedback: string } | null> {
   if (!genAI) return { isCorrect: false, feedback: "AI grading is disabled (API key missing)." }; // Return default if API key is missing

  // Construct the prompt, adding grade level context if provided
  const prompt = `
    Word: "${word}"
    User's Sentence: "${sentence}"
    ${gradeLevel ? `Assume the user is in grade ${gradeLevel}.` : ''}

    Analyze the user's sentence. Does it demonstrate a clear and correct understanding of the word "${word}" in context${gradeLevel ? ` appropriate for a grade ${gradeLevel} student` : ''}?
    Provide your response in JSON format with two keys:
    1.  "isCorrect": boolean (true if the usage is clearly correct, false otherwise)
    2.  "feedback": string (a brief explanation for the user, e.g., "Good usage!" or "The sentence doesn't clearly show understanding of the word's meaning." Also, evaluate the sentence quality, and provide concise, friendly feedback only if constructive.

    Example JSON format:
    {
      "isCorrect": true,
      "feedback": "Excellent! The sentence uses the word correctly in context."
    }
    or
    {
      "isCorrect": false,
      "feedback": "This sentence doesn't quite capture the meaning of '${word}'. Try focusing on [brief hint]."
    }

    Provide only the JSON object. Be strict - only mark as correct if the usage is unambiguous${gradeLevel ? ` for their grade level` : ''}.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    let responseText = result.response.text();
    // Clean the response text: remove potential markdown fences and trim
    responseText = responseText.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');

     // Attempt to parse the cleaned JSON response
    const parsed = JSON.parse(responseText);
    if (typeof parsed.isCorrect === 'boolean' && parsed.feedback) {
      return {
        isCorrect: parsed.isCorrect,
        feedback: parsed.feedback,
      };
    } else {
      console.error("Gemini gradeSentence response missing expected fields:", responseText);
      // Fallback if parsing fails
      return { isCorrect: false, feedback: "AI analysis failed. Please try again." };
    }
  } catch (error) {
    console.error(`Error grading sentence for word "${word}" with Gemini:`, error);
    return { isCorrect: false, feedback: "Error during AI analysis." }; // Return error feedback
  }
}
