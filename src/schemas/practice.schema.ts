import { z } from 'zod';

export enum PracticeType {
  VOCABULARY = 'VOCABULARY',
  GRAMMAR = 'GRAMMAR',
  LISTENING = 'LISTENING',
  READING_WRITING = 'READING_WRITING'
}

export const startVocabSessionSchema = z.object({
  wordBankId: z.string().cuid(), // Expect a single CUID for the bank
});

export const getNextVocabWordSchema = z.object({
  practiceSessionId: z.string(),
});

export const submitVocabAnswerSchema = z.object({
  practiceSessionId: z.string(),
  wordId: z.string(),
  userSentence: z.string().min(1, "Please enter a sentence."),
  easeChosen: z.number().min(1).max(4), // 1=Again, 2=Hard, 3=Good, 4=Easy
});

export const getVocabSessionSummarySchema = z.object({
  practiceSessionId: z.string(),
});

export const startReadingWritingPracticeSessionSchema = z.object({
  questionSetId: z.string().uuid(),
});

export const practiceSessionChatSchema = z.object({
  practiceSessionId: z.string().uuid(),
  message: z.string().min(1, "Message cannot be empty"),
});

export const getPracticeSessionHistorySchema = z.object({
  questionSetId: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
  includeChatHistory: z.boolean().default(false),
});
