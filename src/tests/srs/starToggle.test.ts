import { prisma } from '@/lib/db/prisma';
import { getStarredWords, toggleWordStar } from '@/lib/srs/starToggle';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function createMockWord(id: string, isStarred: boolean, wordBankId: string) {
  return {
    id,
    wordBankId,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewDate: new Date(),
    isStarred,
    notes: null,
    wordMasterId: 'master1',
    text: `word-${id}`,
    mastery: 0,
    nextDueAtReviewCount: 0,
    timesSeen: 0,
    successRate: 0,
    sampleSentences: []
  };
}

describe('Star Toggle Logic', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should toggle star status of a word', async () => {
    const mockWord = createMockWord('word1', false, 'bank1');

    vi.mocked(prisma.word.findUnique).mockResolvedValue(mockWord);
    vi.mocked(prisma.word.update).mockResolvedValue({ ...mockWord, isStarred: true });

    const result = await toggleWordStar('word1');
    expect(result.isStarred).toBe(true);
    expect(prisma.word.update).toHaveBeenCalledWith({
      where: { id: 'word1' },
      data: { isStarred: true }
    });
  });

  it('should throw error if word not found', async () => {
    vi.mocked(prisma.word.findUnique).mockResolvedValue(null);
    await expect(toggleWordStar('nonexistent')).rejects.toThrow('Word not found');
  });

  it('should get starred words for a user', async () => {
    const mockStarredWords = [
      createMockWord('word1', true, 'bank1'),
      createMockWord('word2', true, 'bank1')
    ];

    vi.mocked(prisma.word.findMany).mockResolvedValue(mockStarredWords);
    const result = await getStarredWords('user1');
    expect(result).toHaveLength(2);
    expect(result.every(w => w.isStarred)).toBe(true);
  });
});