import { prisma } from '@/lib/db/prisma';
import { getRandomizedWords, type WordWithMaster } from '@/lib/srs/wordRandomizer';
import { PrismaPromise } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface MockWord extends WordWithMaster {}

function mockPrismaResponse<T>(data: T): PrismaPromise<T> {
  return data as unknown as PrismaPromise<T>;
}

function createMockWord(id: string, wordBankId: string, nextReviewDate: Date, isStarred = false, mastery = 0): MockWord {
  return {
    id,
    wordBankId,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewDate,
    isStarred,
    notes: null,
    wordMasterId: 'master1',
    text: `word-${id}`,
    mastery,
    nextDueAtReviewCount: 0,
    timesSeen: 0,
    successRate: 0,
    wordMaster: {
      sampleSentences: [`Sample for ${id}`]
    }
  } as MockWord;
}

describe('Word Randomization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return empty array for empty word bank', async () => {
    vi.mocked(prisma.word.findMany).mockReturnValue(mockPrismaResponse([]));
    const result = await getRandomizedWords('empty-bank');
    expect(result).toEqual([]);
  });

  it('should prioritize starred words', async () => {
    const mockWords = [
      createMockWord('word1', 'bank1', new Date('2025-01-01'), false, 0.5),
      createMockWord('word2', 'bank1', new Date('2025-01-01'), true, 0.5),
      createMockWord('word3', 'bank1', new Date('2025-01-01'), false, 0.5)
    ];
    
    vi.mocked(prisma.word.findMany).mockReturnValue(mockPrismaResponse(mockWords));
    const result = await getRandomizedWords('bank1');
    
    // Starred word should be first
    expect(result[0].isStarred).toBe(true);
  });

  it('should prioritize lower mastery words', async () => {
    const mockWords = [
      createMockWord('word1', 'bank1', new Date('2025-01-01'), false, 0.8),
      createMockWord('word2', 'bank1', new Date('2025-01-01'), false, 0.2),
      createMockWord('word3', 'bank1', new Date('2025-01-01'), false, 0.5)
    ];
    
    vi.mocked(prisma.word.findMany).mockReturnValue(mockPrismaResponse(mockWords));
    const result = await getRandomizedWords('bank1');
    
    // Lower mastery should come first
    expect(result[0].mastery).toBeLessThanOrEqual(result[1].mastery);
    expect(result[1].mastery).toBeLessThanOrEqual(result[2].mastery);
  });

  it('should combine star and mastery priorities', async () => {
    const mockWords = [
      createMockWord('word1', 'bank1', new Date('2025-01-01'), false, 0.2),
      createMockWord('word2', 'bank1', new Date('2025-01-01'), true, 0.8),
      createMockWord('word3', 'bank1', new Date('2025-01-01'), false, 0.5)
    ];
    
    vi.mocked(prisma.word.findMany).mockReturnValue(mockPrismaResponse(mockWords));
    const result = await getRandomizedWords('bank1');
    
    // Starred word should be first despite higher mastery
    expect(result[0].isStarred).toBe(true);
    // Then lower mastery words
    expect(result[1].mastery).toBeLessThanOrEqual(result[2].mastery);
  });

  it('should include sample sentences', async () => {
    const mockWords = [
      createMockWord('word1', 'bank1', new Date('2025-01-01'))
    ];
    
    vi.mocked(prisma.word.findMany).mockImplementation((args: any) => {
      if (args.include?.wordMaster) {
        return mockPrismaResponse(mockWords);
      }
      return mockPrismaResponse(mockWords.map(({ wordMaster, ...rest }) => rest));
    });
    
    const result = await getRandomizedWords('bank1');
    
    // Verify the include was requested
    expect(prisma.word.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        wordMaster: expect.anything()
      })
    }));
    
    // Verify sample sentences are included
    expect(result[0].wordMaster?.sampleSentences).toEqual(['Sample for word1']);
  });
});