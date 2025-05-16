import { z } from "zod";

// Schema for a single answer option within a multiple-choice question
export const AnswerOptionSchema = z.object({
  text: z.string(),
});

// Schema for a single Reading & Writing question
export const QuestionSchema = z.object({
  questionText: z.string(),
  type: z.enum(["MULTIPLE_CHOICE"]).default("MULTIPLE_CHOICE"), // Assuming only multiple choice for now
  options: z.array(AnswerOptionSchema), // Array of answer options
  correctAnswer: z.string(), // The text of the correct option
  explanation: z.string().optional(), // Explanation for the correct answer
  strategyTip: z.string().optional(), // AI-generated strategy tip for post-review
});

// Schema for a Reading & Writing passage
export const PassageSchema = z.object({
  content: z.string(), // The reading passage text
  difficulty: z.number().int().min(1).max(5).optional(), // Difficulty level (optional for schema, required in DB)
});

// Schema for a complete Reading & Writing content set (Passage + Questions)
export const ReadingWritingContentSetSchema = z.object({
  passage: PassageSchema,
  questions: z.array(QuestionSchema),
});

// Schema for submitting an answer attempt
export const AnswerAttemptSchema = z.object({
  questionId: z.string(),
  selectedAnswer: z.string(), // The text of the selected option
  practiceSessionId: z.string(),
});

// Schema for fetching a specific practice session
export const GetPracticeSessionSchema = z.object({
  sessionId: z.string(),
});

// Schema for listing practice sessions (used in vocab router, but relevant here)
export const listPracticeSessionsSchema = z.object({
  limit: z.number().int().positive().default(10),
  direction: z.enum(["asc", "desc"]).default("desc"),
  cursor: z.string().optional(),
});