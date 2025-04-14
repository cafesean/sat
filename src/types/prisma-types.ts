// Local Prisma type definitions since client generation is failing
export interface PrismaClient {
  practiceSession: {
    count: (args: any) => Promise<number>;
    findMany: (args: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
  word: {
    findMany: (args: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    createMany: (args: any) => Promise<any>;
  };
  wordBank: {
    findMany: (args: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  wordPracticeLog: {
    findMany: (args: any) => Promise<any[]>;
    create: (args: any) => Promise<any>;
  };
  $queryRaw: (query: TemplateStringsArray, ...values: any[]) => Promise<any[]>;
}
export type PracticeSession = {
  id: string;
  userId: string;
  type: 'VOCABULARY' | 'READING_WRITING';
  startTime: Date;
  endTime?: Date;
  score?: number;
  wordBankId?: string;
  vocabLogs: WordPracticeLog[];
  wordBank?: { name: string };
  _count?: { vocabLogs: number };
};

export type WordPracticeLog = {
  id: string;
  wordId: string;
  practiceSessionId: string;
  timestamp: Date;
  isCorrect: boolean;
};

export type WordBank = {
  id: string;
  name: string;
  userId: string;
};

export type Word = {
  id: string;
  text: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: Date;
  isStarred: boolean;
  notes?: string;
  wordMasterId: string;
  wordBankId: string;
};

export type WordMaster = {
  id: string;
  baseWord: string;
  variations: string[];
  wordType?: string;
  definition?: string;
  sampleSentences: Record<string, string>;
  translations: Record<string, string>;
  isDictionaryWord: boolean;
};