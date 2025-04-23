import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { createTestCaller } from '@/tests/trpc-test-utils';
import { createTestUser, cleanupTestUsers } from '@/tests/test-utils';
import { UserRole } from '@prisma/client';

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

describe('Reading Writing Router', () => {
  let userId: string;
  let testCaller: any;

  beforeEach(async () => {
    vi.resetAllMocks();
    const user = await createTestUser('test-reading-writing@example.com');
    userId = user.id;
    testCaller = createTestCaller({
      id: userId,
      email: 'test-reading-writing@example.com',
      role: UserRole.USER
    });
  });

  afterEach(async () => {
    await cleanupTestUsers([userId]);
  });

  describe('createQuestionSet', () => {
    it('should create a question set with a provided topic', async () => {
      const result = await testCaller.readingWriting.createQuestionSet({
        topic: 'Test Topic'
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
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
      await testCaller.readingWriting.createQuestionSet({
        topic: 'Test Topic'
      });

      const result = await testCaller.readingWriting.listQuestionSets();

      expect(result).toBeDefined();
      expect(result.questionSets).toBeDefined();
      expect(result.questionSets.length).toBeGreaterThan(0);
      expect(result.questionSets[0].topic).toBe('Test Topic');
    });
  });

  describe('getQuestionSet', () => {
    it('should retrieve a specific question set', async () => {
      const createdSet = await testCaller.readingWriting.createQuestionSet({
        topic: 'Test Topic'
      });

      const result = await testCaller.readingWriting.getQuestionSet({
        questionSetId: createdSet.id
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(createdSet.id);
      expect(result.topic).toBe('Test Topic');
    });

    it('should throw an error for non-existent question set', async () => {
      await expect(testCaller.readingWriting.getQuestionSet({
        questionSetId: 'non-existent-id'
      })).rejects.toThrow();
    });
  });

  describe('startReadingWritingSession', () => {
    it('should start a reading writing session', async () => {
      const createdSet = await testCaller.readingWriting.createQuestionSet({
        topic: 'Test Topic'
      });

      const passage = await prisma.passage.create({
        data: {
          content: 'Test passage content',
          questionSetId: createdSet.id,
          questions: {
            create: [
              {
                questionText: 'Test question?',
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 'Option A',
                explanation: 'This is the explanation'
              }
            ]
          }
        }
      });

      const result = await testCaller.readingWriting.startReadingWritingSession({
        questionSetId: createdSet.id
      });

      expect(result).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.session.userId).toBe(userId);
      expect(result.session.questionSetId).toBe(createdSet.id);
    });
  });

  describe('submitAnswerAttempt', () => {
    it('should submit an answer attempt and return correctness', async () => {
      const createdSet = await testCaller.readingWriting.createQuestionSet({
        topic: 'Test Topic'
      });

      const passage = await prisma.passage.create({
        data: {
          content: 'Test passage content',
          questionSetId: createdSet.id,
          questions: {
            create: [
              {
                questionText: 'Test question?',
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 'Option A',
                explanation: 'This is the explanation'
              }
            ]
          }
        }
      });

      const session = await testCaller.readingWriting.startReadingWritingSession({
        questionSetId: createdSet.id
      });

      const question = await prisma.question.findFirst({
        where: { passageId: passage.id }
      });

      const result = await testCaller.readingWriting.submitAnswerAttempt({
        sessionId: session.session.id,
        questionId: question!.id,
        selectedAnswer: 'Option A'
      });

      expect(result).toBeDefined();
      expect(result.isCorrect).toBe(true);
    });
  });
});