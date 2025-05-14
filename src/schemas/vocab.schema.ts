import { z } from "zod";


export const NewWordListItemSchema = z.object({
  text: z.string(),
  interval: z.number(),
  easeFactor: z.number(),
  repetitions: z.number(),
  nextReviewDate: z.date(),
  isStarred: z.boolean(),
  notes: z.string().nullable(),
  wordBankId: z.string().cuid(),
  mastery: z.number(),
  nextDueAtReviewCount: z.number(),
  timesSeen: z.number(),
  successRate: z.number(),
  wordMaster: z.object({
    id: z.string().cuid(),
    baseWord: z.string(),
    wordType: z.enum(["NOUN","VERB","ADJECTIVE","ADVERB","PRONOUN","PREPOSITION","CONJUNCTION","INTERJECTION","ARTICLE"]).nullable(),
    definition: z.string().nullable(),
    sampleSentences: z.record(z.string()).nullable(),
    translations: z.record(z.string()).nullable(),
    isDictionaryWord: z.boolean()
  }),
  practiceCount: z.number(),
  _count: z.object({
    practiceLogs: z.number()
  }).optional()
});


export const WordListItemSchema = z.object({
  id: z.string().cuid(),
  text: z.string(),
  interval: z.number(),
  easeFactor: z.number(),
  repetitions: z.number(),
  nextReviewDate: z.date(),
  isStarred: z.boolean(),
  notes: z.string().nullable(),
  wordBankId: z.string().cuid(),
  mastery: z.number(),
  nextDueAtReviewCount: z.number(),
  timesSeen: z.number(),
  successRate: z.number(),
  wordMaster: z.object({
    id: z.string().cuid(),
    baseWord: z.string(),
    wordType: z.enum(["NOUN","VERB","ADJECTIVE","ADVERB","PRONOUN","PREPOSITION","CONJUNCTION","INTERJECTION","ARTICLE"]).nullable(),
    definition: z.string().nullable(),
    sampleSentences: z.record(z.string()).nullable(),
    translations: z.record(z.string()).nullable(),
    isDictionaryWord: z.boolean()
  }),
  practiceCount: z.number(),
  _count: z.object({
    practiceLogs: z.number()
  }).optional()
});

// Word Bank Schema
export const wordBankSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

// Word CRUD Schemas
export const addWordsSchema = z.object({
  wordBankId: z.string().cuid(),
  wordsText: z.string().min(1),
  languagePreference: z.string().optional() // Add optional language preference
});

export const deleteWordSchema = z.object({
  wordId: z.string().cuid()
});

export const getWordHistorySchema = z.object({
  wordId: z.string().cuid()
});

export const listWordsByBankSchema = z.object({
  wordBankId: z.string().cuid()
});

export const toggleWordStarSchema = z.object({
  wordId: z.string().cuid()
});

export const updateWordNotesSchema = z.object({
  wordId: z.string().cuid(),
  notes: z.string().nullable()
});

export const updateWordSchema = z.object({
  wordId: z.string().cuid(),
  text: z.string().optional(),
  wordMasterId: z.string().cuid().optional()
});

export type WordListItem = z.infer<typeof WordListItemSchema>;
export type WordBank = z.infer<typeof wordBankSchema>;

// Word Rating Schema
export const rateWordSchema = z.object({
  wordId: z.string().cuid(),
  ease: z.number().min(1).max(4) // 1=Again, 2=Hard, 3=Good, 4=Easy
});

export const rateWordReviewCountSchema = z.object({
  wordId: z.string().cuid(),
  correct: z.boolean() // Whether user got the word right
});
