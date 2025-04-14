import { z } from 'zod';

export enum PracticeType {
  VOCABULARY = 'VOCABULARY',
  GRAMMAR = 'GRAMMAR',
  LISTENING = 'LISTENING'
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
