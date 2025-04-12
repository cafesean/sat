import { z } from 'zod';

export const startVocabSessionSchema = z.object({
  wordBankIds: z.array(z.string()).min(1, "Please select at least one word bank."),
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
