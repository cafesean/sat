import { z } from 'zod';

// Schema for creating/updating a word bank
export const wordBankSchema = z.object({
  name: z.string().min(2, {
    message: 'Word bank name must be at least 2 characters.',
  }),
  description: z.string().optional(),
});

export type WordBankInput = z.infer<typeof wordBankSchema>;

// Schema for adding a batch of words
export const addWordsSchema = z.object({
  wordBankId: z.string().cuid({ message: 'Invalid word bank selected.' }),
  wordsText: z.string().min(1, { message: 'Please enter at least one word.' }),
});

export type AddWordsInput = z.infer<typeof addWordsSchema>;

// Schema for listing words by bank
export const listWordsByBankSchema = z.object({
  wordBankId: z.string().cuid(),
});

// Schema for updating a single word's text
export const updateWordSchema = z.object({
  wordId: z.string().cuid(),
  text: z.string().min(1, { message: 'Word cannot be empty.' }).max(100),
});

export type UpdateWordInput = z.infer<typeof updateWordSchema>;

// Schema for updating word notes
export const updateWordNotesSchema = z.object({
  wordId: z.string().cuid(),
  notes: z.string().max(1000).nullable(), // Allow null or string, max 1000 chars
});

// Schema for deleting a single word
export const deleteWordSchema = z.object({
  wordId: z.string().cuid(),
});

// Schema for toggling star status
export const toggleWordStarSchema = z.object({
  wordId: z.string().cuid(),
});

// Schema for fetching word practice history
export const getWordHistorySchema = z.object({
  wordId: z.string().cuid(), // Ensure it's a CUID if word IDs are CUIDs
});
