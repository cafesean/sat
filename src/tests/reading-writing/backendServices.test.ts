import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTRPCMsw } from 'msw-trpc';
import { appRouter } from '@/server/api/root';
import { prisma } from '@/lib/db/prisma';
import { test } from '@/tests/trpc-test-utils';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Setup MSW for tRPC
const trpcMsw = createTRPCMsw(appRouter);

// Mock external dependencies
vi.mock('@google/generative-ai');
vi.mock('@/lib/api/gemini');

describe('Reading/Writing tRPC Router', () => {
  const ctx = test.createTRPCContext();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: vi.fn().mockReturnValue('Mocked Topic') }
        })
      })
    }));
  });

  describe('startReadingWritingSession', () => {
    it('should start a session with valid questionSetId', async () => {
      const mockQuestionSet = {
        id: 'set-1',
        title: 'Test Set',
        questions: [],
        userId: 'user-1'
      };

      vi.mocked(prisma.questionSet.findUnique).mockResolvedValue(mockQuestionSet);

      const result = await caller.readingWriting.startReadingWritingSession({
        questionSetId: 'set-1'
      });

      expect(result).toHaveProperty('sessionId');
      expect(prisma.questionSet.findUnique).toHaveBeenCalledWith({
        where: { id: 'set-1' },
        include: { questions: true }
      });
    });

    it('should throw error for invalid questionSetId', async () => {
      vi.mocked(prisma.questionSet.findUnique).mockResolvedValue(null);

      await expect(
        caller.readingWriting.startReadingWritingSession({
          questionSetId: 'invalid-id'
        })
      ).rejects.toThrowError('Question set not found');
    });
  });

  describe('generateRandomTopic', () => {
    it('should generate a random topic using Gemini', async () => {
      const result = await caller.readingWriting.generateRandomTopic();
      expect(result).toBe('Mocked Topic');
      expect(GoogleGenerativeAI).toHaveBeenCalled();
    });

    it('should handle Gemini API errors', async () => {
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => {
        throw new Error('API Error');
      });

      await expect(caller.readingWriting.generateRandomTopic()).rejects.toThrowError(
        'Failed to generate topic'
      );
    });
  });

  // Additional tests for other procedures would go here
  // including tests for:
  // - submitWritingResponse
  // - getSessionResults
  // - chat operations
});