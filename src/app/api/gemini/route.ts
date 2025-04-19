import { env } from '@/env.mjs';
import { authOptions } from '@/lib/auth/options';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Input validation schema
const geminiRequestSchema = z.object({
  prompt: z.string().min(1),
  generationConfig: z.object({
    temperature: z.number().min(0).max(1).optional(),
    topK: z.number().min(1).optional(),
    topP: z.number().min(0).max(1).optional(),
    maxOutputTokens: z.number().min(1).optional(),
  }).optional(),
});

// Initialize the client only if the API key exists
const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;
const modelName = env.GEMINI_MODEL_NAME;

// Default configuration for content generation
const defaultGenerationConfig = {
  temperature: 0.7,
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

export async function POST(request: Request) {
  // 1. Check authentication
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and validate request body
  let requestBody;
  try {
    requestBody = await request.json();
    const validationResult = geminiRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: validationResult.error.format() }, { status: 400 });
    }
    requestBody = validationResult.data; // Use validated data
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!genAI) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  // 3. Process the request with Gemini
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: requestBody.prompt }] }],
      generationConfig: requestBody.generationConfig || defaultGenerationConfig,
      safetySettings,
    });

    const responseText = result.response.text().trim();
    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error('Error in /api/gemini:', error);
    return NextResponse.json({ error: 'Failed to process request with Gemini' }, { status: 500 });
  }
}