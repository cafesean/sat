import { gradeSentence } from '@/lib/api/gemini';
import { authOptions } from '@/lib/auth/options';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Input validation schema
const gradeRequestSchema = z.object({
  word: z.string().min(1),
  sentence: z.string().min(1),
  gradeLevel: z.number().int().min(1).max(12).optional().nullable(), // Add optional gradeLevel
});

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
    const validationResult = gradeRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: validationResult.error.format() }, { status: 400 });
    }
    requestBody = validationResult.data; // Use validated data
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Destructure validated data, including gradeLevel
  const { word, sentence, gradeLevel } = requestBody;

  // 3. Call the Gemini grading function, passing gradeLevel
  try {
    const result = await gradeSentence(word, sentence, gradeLevel);
    if (result === null) {
      // Handle case where grading might fail internally in gradeSentence
      return NextResponse.json({ error: 'AI grading failed' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /api/grade-sentence:', error);
    return NextResponse.json({ error: 'Internal server error during grading' }, { status: 500 });
  }
}
