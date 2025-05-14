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
  questions: z.array(QuestionSchema).min(5).max(10), // Typically 5-10 questions per passage
});

export type AnswerOption = z.infer<typeof AnswerOptionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Passage = z.infer<typeof PassageSchema>;
export type ContentSet = z.infer<typeof ContentSetSchema>;