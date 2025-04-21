import { env } from "@/env.mjs";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';

// Configuration for content generation
const generationConfig = {
  temperature: 0.7,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
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
  // Remove markdown code block syntax if present
  let cleaned = text.trim();
  
  // Remove beginning markdown code block markers like ```json, ```js, etc.
  cleaned = cleaned.replace(/^```(?:json|js|javascript)?\s*/i, '');
  
  // Remove ending markdown code block markers
  cleaned = cleaned.replace(/\s*```$/i, '');
  
  return cleaned;
}

/**
 * Enriches a word with definition, sample sentences, translation, and word type using Gemini.
 * @param word The word to enrich
 * @param languagePreference Target translation language
 * @param gradeLevel Optional grade level for content difficulty
 * @param existingSentences Optional array of existing sample sentences to build upon
 */
export async function enrichWord(
  word: string,
  languagePreference?: string,
  gradeLevel?: number | null,
  existingSentences: string[] = []
): Promise<{ definition: string; sampleSentences: string[]; translation: string; wordType: string } | null> {
  if (!env.GEMINI_API_KEY) return null;

  const prompt = `
    For the English word "${word}", provide the following in JSON format:
    1. "wordType": The primary part of speech (e.g., "noun", "verb", "adjective", "adverb").
    2. "definition": A concise definition suitable for ${gradeLevel ? `a grade ${gradeLevel} student` : 'an SAT student'}.
    3. "sampleSentences": An array of 5-7 clear sample sentences demonstrating:
        - Different grammatical forms (if applicable)
        - Various contexts (academic, casual, professional)
        - Different sentence structures (simple, compound, complex)
        ${existingSentences.length > 0 ? `Build upon these existing sentences:\n${existingSentences.map(s => `- ${s}`).join('\n')}` : ''}
    4. "translation": The ${languagePreference || 'Chinese'} translation of the word.

    Requirements:
    - Include at least one example showing the word in different tenses (if verb)
    - Include examples showing both literal and figurative meanings (if applicable)
    - Ensure sentences are natural and idiomatic
    - Vary sentence length and complexity

    Example JSON format:
    {
      "wordType": "adjective",
      "definition": "lasting for a very short time",
      "sampleSentences": [
        "The ephemeral beauty of the cherry blossoms lasts only a few weeks.",
        "Their happiness was ephemeral, fading as quickly as it had come."
      ],
      "translation": "短暂的"
    }

    Provide only the JSON object.
  `;

  try {
    let responseText;
    
    // Direct API call when running on server-side (like in tRPC procedures)
    if (isServer()) {
      console.log("Enriching word on server-side");
      const genAI = initGeminiClient();
      if (!genAI) return null;
      
      const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL_NAME });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
      });
      
      responseText = result.response.text().trim();
    } 
    // Use fetch to API route when running on client-side
    else {
      console.log("Enriching word on client-side");
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          generationConfig
        }),
      });

      if (!response.ok) {
        console.error('Failed to call Gemini API:', response.statusText);
        return null;
      }

      const data = await response.json();
      responseText = data.response;
    }
    
    // Clean the response text before parsing
    const cleanedResponseText = cleanJsonResponse(responseText);
    console.log("Cleaned response:", cleanedResponseText.substring(0, 100) + "...");
    
    try {
      const parsed = JSON.parse(cleanedResponseText);
      
      if (parsed.wordType && parsed.definition && parsed.sampleSentences && parsed.translation) {
        return {
          wordType: parsed.wordType,
          definition: parsed.definition,
          sampleSentences: parsed.sampleSentences,
          translation: parsed.translation,
        };
      }
    } catch (parseError) {
      console.error(`Error parsing JSON for word "${word}":`, parseError);
      console.log("Raw response:", responseText);
    }
    
    return null;
  } catch (error) {
    console.error(`Error enriching word "${word}":`, error);
    return null;
  }
}

/**
 * Grades a user's sentence for correct usage of a given word using Gemini.
 */
export async function gradeSentence(
  word: string,
  sentence: string,
  gradeLevel?: number | null
): Promise<{ isCorrect: boolean; feedback: string } | null> {
  if (!env.GEMINI_API_KEY) return { isCorrect: false, feedback: "AI grading is disabled (API key missing)." };

  const prompt = `
    Word: "${word}"
    User's Sentence: "${sentence}"
    ${gradeLevel ? `Assume the user is in grade ${gradeLevel}.` : ''}

    Analyze the user's sentence. Does it demonstrate a clear and correct understanding of the word "${word}" in context${gradeLevel ? ` appropriate for a grade ${gradeLevel} student` : ''}?
    Provide your response in JSON format with two keys:
    1. "isCorrect": boolean (true if the usage is clearly correct, false otherwise)
    2. "feedback": string (a brief explanation for the user)

    Provide only the JSON object.
  `;

  try {
    let responseText;
    
    // Direct API call when running on server-side (like in tRPC procedures)
    if (isServer()) {
      console.log("Grading sentence on server-side");
      const genAI = initGeminiClient();
      if (!genAI) return { isCorrect: false, feedback: "AI grading is disabled (API client initialization failed)." };
      
      const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL_NAME });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
      });
      
      responseText = result.response.text().trim();
    } 
    // Use fetch to API route when running on client-side
    else {
      console.log("Grading sentence on client-side");
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          generationConfig
        }),
      });

      if (!response.ok) {
        console.error('Failed to call Gemini API:', response.statusText);
        return { isCorrect: false, feedback: "AI grading service unavailable" };
      }

      const data = await response.json();
      responseText = data.response;
    }
    
    // Clean the response text before parsing
    const cleanedResponseText = cleanJsonResponse(responseText);
    
    try {
      const parsed = JSON.parse(cleanedResponseText);
      
      if (typeof parsed.isCorrect === 'boolean' && parsed.feedback) {
        return parsed;
      }
    } catch (parseError) {
      console.error(`Error parsing JSON for grading word "${word}":`, parseError);
      console.log("Raw response:", responseText);
      return { isCorrect: false, feedback: "AI analysis failed: Unable to parse response." };
    }
    
    return { isCorrect: false, feedback: "AI analysis failed. Please try again." };
  } catch (error) {
    console.error(`Error grading sentence for word "${word}":`, error);
    return { isCorrect: false, feedback: "Error during AI analysis." };
  }
}

/**
 * Generates reading and writing content (passages with questions) using Gemini.
 */
export async function generateReadingWritingContent(
  topic: string,
  difficultyLevel: 'easy' | 'medium' | 'hard' = 'medium',
  gradeLevel?: number | null
): Promise<{ passage: string; questions: string[] } | null> {
  if (!env.GEMINI_API_KEY) return null;

  const prompt = `
    Create a reading passage about "${topic}" at ${difficultyLevel} difficulty level${gradeLevel ? ` for grade ${gradeLevel}` : ''}.
    Include 3-5 comprehension questions about the passage.

    Return in JSON format:
    {
      "passage": "The passage text...",
      "questions": ["Question 1", "Question 2", "Question 3"]
    }
  `;

  try {
    let responseText;
    
    // Direct API call when running on server-side (like in tRPC procedures)
    if (isServer()) {
      console.log("Generating R&W content on server-side");
      const genAI = initGeminiClient();
      if (!genAI) return null;
      
      const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL_NAME });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
      });
      
      responseText = result.response.text().trim();
    } 
    // Use fetch to API route when running on client-side
    else {
      console.log("Generating R&W content on client-side");
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          generationConfig
        }),
      });

      if (!response.ok) {
        console.error('Failed to generate R&W content:', response.statusText);
        return null;
      }

      const data = await response.json();
      responseText = data.response;
    }
    
    // Clean the response text before parsing
    const cleanedResponseText = cleanJsonResponse(responseText);
    
    try {
      const parsed = JSON.parse(cleanedResponseText);
      
      if (parsed.passage && parsed.questions) {
        return parsed;
      }
    } catch (parseError) {
      console.error(`Error parsing JSON for reading/writing content on topic "${topic}":`, parseError);
      console.log("Raw response:", responseText);
    }
    
    return null;
  } catch (error) {
    console.error('Error generating R&W content:', error);
    return null;
  }
}
