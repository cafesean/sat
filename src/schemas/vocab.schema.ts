import { z } from 'zod';

// Schema for creating/updating a word bank
export const wordBankSchema = z.object({
  name: z.string().min(2, {
    message: 'Word bank name must be at least 2 characters.',
  }),
  description: z.string().optional(), // Restore description
});

export type WordBankInput = z.infer<typeof wordBankSchema>;

// Schema for adding a batch of words
export const addWordsSchema = z.object({
  wordBankId: z.string().cuid({ message: 'Invalid word bank selected.' }), // Ensure it's a CUID
  wordsText: z.string().min(1, { message: 'Please enter at least one word.' }), // Raw text from textarea
});

export type AddWordsInput = z.infer<typeof addWordsSchema>;

// Schema for listing words by bank
export const listWordsByBankSchema = z.object({
  wordBankId: z.string().cuid(),
});

// Schema for updating a single word (only text is editable for now)
export const updateWordSchema = z.object({
  wordId: z.string().cuid(),
  text: z.string().min(1, { message: 'Word cannot be empty.' }),
});

export type UpdateWordInput = z.infer<typeof updateWordSchema>;

// Schema for deleting a single word
export const deleteWordSchema = z.object({
  wordId: z.string().cuid(),
});

// Schema for toggling the starred status of a word
export const toggleWordStarSchema = z.object({
  wordId: z.string().cuid(),
});

// Schema for fetching word practice history
export const getWordHistorySchema = z.object({
  wordId: z.string(),
});
