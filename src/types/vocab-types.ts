
// Type definition for a word used in SRS practice sessions
export type WordSrsData = {
  id: string;
  text: string;
  isStarred: boolean;
  sampleSentences: string[]; // Assuming sampleSentences is an array of strings
  successRate: number;
  // Add other properties from the Word and WordMaster models that are relevant for SRS practice
  definition?: string | null;
  wordType?: string | null;
  translations?: string[] | null;
  notes?: string | null;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: Date;
  mastery: number;
  nextDueAtReviewCount: number;
  timesSeen: number;
  practiceCount: number; // This is a computed field, but useful in the practice context
};

// You can add other vocabulary-related types here in the future