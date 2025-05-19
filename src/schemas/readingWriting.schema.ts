import { z } from "zod";

// Define schemas for R&W content structure here

export const AnswerOptionSchema = z.object({
  text: z.string(),
});

export const QuestionSchema = z.object({
  questionText: z.string(),
  type: z.enum(["MULTIPLE_CHOICE"]), // Assuming only multiple choice for now
  options: z.array(AnswerOptionSchema),
  correctAnswer: z.string(), // The text of the correct answer
  explanation: z.string().optional(), // AI generated explanation
  strategyTip: z.string().optional(), // AI generated strategy tip for review
});

export const PassageSchema = z.object({
  content: z.string(),
  difficulty: z.number().int().min(1), // Assuming difficulty is an integer >= 1
});

export const ContentSetSchema = z.object({
  passage: PassageSchema,
  questions: z.array(QuestionSchema).min(5, "Content set must have at least 5 questions").max(10, "Content set cannot have more than 10 questions"),
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