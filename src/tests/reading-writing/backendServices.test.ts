import { prisma } from '@/lib/db/prisma';
import { type AppRouter } from '@/server/api/root';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createTRPCMsw } from 'msw-trpc';
import { beforeEach, describe, expect, it, vi } from 'vitest'; // Added 'test' here
import { createTestCaller } from '../trpc-test-utils';

// Setup MSW for tRPC
const trpcMsw = createTRPCMsw<AppRouter>();

// Mock external dependencies
vi.mock('@google/generative-ai');
vi.mock('@/lib/api/gemini');

describe('Reading/Writing tRPC Router', () => {
  // Use createTestCaller to get the caller with a mocked user session
  const mockUser = { id: 'test-user-id', email: 'test@example.com', role: 'USER' as const }; // Define a mock user
  const caller = createTestCaller(mockUser);


  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: vi.fn().mockReturnValue('Mocked Topic') }
        })
      })
    }) as any); // Added type assertion 'as any'
  });

  describe('startReadingWritingSession', () => {
    it('should start a session with valid questionSetId', async () => {
      const mockQuestionSet = {
        id: 'set-1',
        title: 'Test Set',
        passages: [], // Corrected from 'questions' to 'passages'
        userId: 'test-user-id' // Match the ID of the mock user
      };

      vi.mocked(prisma.questionSet.findUnique).mockResolvedValue(mockQuestionSet as any); // Added 'as any' for type compatibility with mock

      const result = await caller.readingWriting.startReadingWritingSession({
        questionSetId: 'set-1'
      });

      expect(result).toHaveProperty('session');
      expect(prisma.questionSet.findUnique).toHaveBeenCalledWith({
        where: { id: 'set-1' },
        include: { passages: true }
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
        'API Error' // Updated to match the actual error message
      );
    });
  });

  // Additional tests for other procedures would go here
  // including tests for:
  // - submitWritingResponse
  // - getSessionResults
  // - chat operations
});