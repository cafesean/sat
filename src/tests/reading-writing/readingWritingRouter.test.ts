import { prisma } from '@/lib/db/prisma';
import { createTestCaller } from '@/tests/trpc-test-utils';
import { UserRole } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock createTestUser and cleanupTestUsers
vi.mock('@/tests/test-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/tests/test-utils')>();
  return {
    ...actual,
    createTestUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test-user@example.com', role: UserRole.USER }),
    cleanupTestUsers: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock the Gemini API
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: { text: vi.fn().mockReturnValue('Mock AI Response') }
      })
    })
  })),
  HarmBlockThreshold: { BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE' },
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
  }
}));

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    questionSet: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    passage: {
      create: vi.fn(),
    },
    practiceSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    question: {
      findFirst: vi.fn(),
    },
    answerAttempt: {
      create: vi.fn(),
    },
  },
}));

describe('Reading Writing Router', () => {
  let userId: string;
  let testCaller: any;

  beforeEach(async () => {
    vi.resetAllMocks();
    // userId is now set from the mock
    userId = 'test-user-id';
    testCaller = createTestCaller({
      id: userId,
      email: 'test-reading-writing@example.com',
      role: UserRole.USER
    });
  });

  afterEach(async () => {
    // cleanupTestUsers is mocked, so this won't actually clean up,
    // but it satisfies the TypeScript compiler.
    // For real cleanup, the mock would need to be more sophisticated or not used.
    const testUtils = await import('@/tests/test-utils');
    await testUtils.cleanupTestUsers([userId]);
  });

  describe('createQuestionSet', () => {
    it('should create a question set with a provided topic', async () => {
      // Mock the questionSet creation
      vi.spyOn(prisma.questionSet, 'create').mockResolvedValueOnce({
        id: 'mock-question-set-id',
        topic: 'Test Topic',
        userId: userId,
        createdAt: new Date()
      });
      
      const result = await testCaller.readingWriting.createQuestionSet({
        topic: 'Test Topic'
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('mock-question-set-id');
      expect(result.topic).toBe('Test Topic');
      expect(result.userId).toBe(userId);
    });

    it('should handle errors when creating a question set', async () => {
      vi.spyOn(prisma.questionSet, 'create').mockRejectedValueOnce(new Error('Database error'));

      await expect(testCaller.readingWriting.createQuestionSet({
        topic: 'Test Topic'
      })).rejects.toThrow();
    });
  });

  describe('listQuestionSets', () => {
    it('should list question sets for the user', async () => {
      // Mock the questionSet creation
      vi.spyOn(prisma.questionSet, 'create').mockResolvedValueOnce({
        id: 'mock-question-set-id',
        topic: 'Test Topic',
        userId: userId,
        createdAt: new Date()
      });
      
      // Mock the questionSet findMany
      vi.spyOn(prisma.questionSet, 'findMany').mockResolvedValueOnce([{
        id: 'mock-question-set-id',
        topic: 'Test Topic',
        userId: userId,
        createdAt: new Date()
      }]);

      await testCaller.readingWriting.createQuestionSet({
        topic: 'Test Topic'
      });

      const result = await testCaller.readingWriting.listQuestionSets({});

      expect(result).toBeDefined();
      expect(result.questionSets).toBeDefined();
      expect(result.questionSets.length).toBeGreaterThan(0);
      expect(result.questionSets[0].topic).toBe('Test Topic');
    });
  });

  describe('getQuestionSet', () => {
    it('should retrieve a specific question set', async () => {
      // Mock the questionSet creation
      const mockQuestionSet = {
        id: 'mock-question-set-id',
        topic: 'Test Topic',
        userId: userId,
        createdAt: new Date(),
        passages: []
      };
      
      vi.spyOn(prisma.questionSet, 'create').mockResolvedValueOnce(mockQuestionSet);
      
      // Mock the questionSet findUnique
      vi.spyOn(prisma.questionSet, 'findUnique').mockResolvedValueOnce(mockQuestionSet);

      const createdSet = await testCaller.readingWriting.createQuestionSet({
        topic: 'Test Topic'
      });

      const result = await testCaller.readingWriting.getQuestionSet({
        questionSetId: createdSet.id
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(mockQuestionSet.id);
      expect(result.topic).toBe(mockQuestionSet.topic);
    });

    it('should throw an error for non-existent question set', async () => {
      await expect(testCaller.readingWriting.getQuestionSet({
        questionSetId: 'non-existent-id'
      })).rejects.toThrow();
    });
  });

  describe('startReadingWritingSession', () => {
    it('should start a reading writing session', async () => {
      // Mock question set and passages
      const mockQuestionSet = {
        id: 'mock-question-set-id',
        topic: 'Test Topic',
        userId: userId,
        createdAt: new Date(),
        passages: [{
          id: 'mock-passage-id',
          content: 'Test passage content',
          difficulty: 2,
          questionSetId: 'mock-question-set-id',
          createdAt: new Date(),
          questions: []
        }]
      };
      
      // Mock the session that will be created
      const mockSession = {
        id: 'mock-session-id',
        userId: userId,
        type: 'READING_WRITING',
        startTime: new Date(),
        endTime: null,
        createdAt: new Date(),
        score: null,
        difficulty: 2,
        wordBankId: null,
        questionSetId: 'mock-question-set-id',
        passage: {
          id: 'mock-passage-id',
          content: 'Test passage content',
          difficulty: 2,
          questionSetId: 'mock-question-set-id',
          createdAt: new Date(),
          questions: []
        }
      };
      
      vi.spyOn(prisma.questionSet, 'create').mockResolvedValueOnce(mockQuestionSet);
      vi.spyOn(prisma.questionSet, 'findUnique').mockResolvedValueOnce(mockQuestionSet);
      vi.spyOn(prisma.practiceSession, 'create').mockResolvedValueOnce(mockSession);

      const createdSet = await testCaller.readingWriting.createQuestionSet({
        topic: 'Test Topic'
      });

      const result = await testCaller.readingWriting.startReadingWritingSession({
        questionSetId: createdSet.id
      });

      expect(result).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.session.userId).toBe(userId);
      expect(result.session.questionSetId).toBe('mock-question-set-id');
    });
  });

  describe('submitAnswerAttempt', () => {
    it('should submit an answer attempt and return correctness', async () => {
      // Mock question set with passage and question
      const mockQuestion = {
        id: 'mock-question-id',
        questionText: 'Test question?',
        type: 'MULTIPLE_CHOICE',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        explanation: 'This is the explanation',
        passageId: 'mock-passage-id'
      };
      
      const mockPassage = {
        id: 'mock-passage-id',
        content: 'Test passage content',
        difficulty: 2,
        questionSetId: 'mock-question-set-id',
        createdAt: new Date(),
        questions: [mockQuestion]
      };
      
      const mockQuestionSet = {
        id: 'mock-question-set-id',
        topic: 'Test Topic',
        userId: userId,
        createdAt: new Date(),
        passages: [mockPassage]
      };
      
      // Mock the session
      const mockSession = {
        id: 'mock-session-id',
        userId: userId,
        type: 'READING_WRITING',
        startTime: new Date(),
        endTime: null,
        createdAt: new Date(),
        score: null,
        difficulty: 2,
        wordBankId: null,
        questionSetId: 'mock-question-set-id',
        passage: mockPassage
      };
      
      // Mock the answer attempt
      const mockAnswerAttempt = {
        id: 'mock-attempt-id',
        practiceSessionId: 'mock-session-id',
        questionId: 'mock-question-id',
        userId: userId,
        selectedAnswer: 'Option A',
        isCorrect: true,
        createdAt: new Date()
      };
      
      vi.spyOn(prisma.questionSet, 'create').mockResolvedValueOnce(mockQuestionSet);
      vi.spyOn(prisma.questionSet, 'findUnique').mockResolvedValueOnce(mockQuestionSet);
      vi.spyOn(prisma.practiceSession, 'create').mockResolvedValueOnce(mockSession);
      vi.spyOn(prisma.practiceSession, 'findUnique').mockResolvedValueOnce(mockSession);
      vi.spyOn(prisma.question, 'findFirst').mockResolvedValueOnce(mockQuestion);
      vi.spyOn(prisma.answerAttempt, 'create').mockResolvedValueOnce(mockAnswerAttempt);

      const createdSet = await testCaller.readingWriting.createQuestionSet({
        topic: 'Test Topic'
      });

      const session = await testCaller.readingWriting.startReadingWritingSession({
        questionSetId: createdSet.id
      });

      const result = await testCaller.readingWriting.submitAnswerAttempt({
        sessionId: session.session.id,
        questionId: 'mock-question-id',
        selectedAnswer: 'Option A'
      });

      expect(result).toBeDefined();
      expect(result.isCorrect).toBe(true);
      expect(result.answerAttemptId).toBe('mock-attempt-id');
    });
  });
});