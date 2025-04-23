import { prisma } from '@/lib/db/prisma';
import { cloneSession } from '@/lib/srs/sessionClone';
import { PracticeType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Session Cloning', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should successfully clone a session with word bank and words', async () => {
    const mockSession = {
      id: 'session1',
      userId: 'user1',
      type: PracticeType.VOCABULARY,
      difficulty: 2,
      wordBankId: 'bank1',
      createdAt: new Date(),
      startTime: new Date(),
      endTime: null,
      score: null,
      lastFetchedWordId: null,
      questionSetId: null,
      wordBank: {
        id: 'bank1',
        words: [
          {
            id: 'word1',
            wordBankId: 'bank1',
            wordMasterId: 'master1',
            text: 'test',
            isStarred: false,
            notes: '',
            interval: 1,
            easeFactor: 2.5,
            repetitions: 0,
            nextReviewDate: new Date(),
            mastery: 0,
            nextDueAtReviewCount: 0,
            timesSeen: 0,
            successRate: 0,
            practiceLogs: [],
            wordMaster: {
              id: 'master1',
              baseWord: 'test',
              sampleSentences: ['This is a test sentence.']
            }
          }
        ]
      },
      vocabLogs: []
    };

    vi.mocked(prisma.practiceSession.findUnique).mockResolvedValue(mockSession);
    vi.mocked(prisma.practiceSession.create).mockResolvedValue({
      ...mockSession,
      id: 'session2',
      createdAt: new Date(),
      startTime: new Date(),
      endTime: null,
      score: null,
      lastFetchedWordId: null,
      questionSetId: null
    });
    vi.mocked(prisma.word.createMany).mockResolvedValue({ count: 1 });

    const result = await cloneSession('session1');

    expect(prisma.practiceSession.findUnique).toHaveBeenCalledWith({
      where: { id: 'session1' },
      include: {
        wordBank: {
          include: {
            words: {
              include: {
                practiceLogs: {
                  orderBy: { timestamp: 'desc' },
                  take: 1
                },
                wordMaster: {
                  select: {
                    id: true,
                    baseWord: true,
                    sampleSentences: true
                  }
                }
              },
              select: {
                id: true,
                wordBankId: true,
                wordMasterId: true,
                text: true,
                isStarred: true,
                notes: true,
                interval: true,
                easeFactor: true,
                repetitions: true,
                nextReviewDate: true,
                mastery: true,
                nextDueAtReviewCount: true,
                timesSeen: true,
                successRate: true
              }
            }
          }
        },
        vocabLogs: true
      }
    });

    expect(prisma.practiceSession.create).toHaveBeenCalledWith({
      data: {
        userId: 'user1',
        type: PracticeType.VOCABULARY,
        difficulty: 2,
        wordBankId: 'bank1',
        startTime: expect.any(Date),
        endTime: null,
        score: null,
        lastFetchedWordId: null,
        questionSetId: null
      }
    });

    expect(prisma.word.createMany).toHaveBeenCalledWith({
      data: [{
        wordBankId: 'bank1',
        wordMasterId: 'master1',
        text: 'test',
        isStarred: false,
        notes: '',
        sampleSentences: ['This is a test sentence.'],
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: expect.any(Date),
        mastery: 0,
        nextDueAtReviewCount: 0,
        timesSeen: 0,
        successRate: 0
      }]
    });

    expect(result.id).not.toBe('session1');
  });

  it('should throw error when session not found', async () => {
    vi.mocked(prisma.practiceSession.findUnique).mockResolvedValue(null);

    await expect(cloneSession('invalid')).rejects.toThrow('Session not found');
  });

  it('should throw error when session has no word bank', async () => {
    const mockSession = {
      id: 'session1',
      userId: 'user1',
      type: PracticeType.VOCABULARY,
      difficulty: 2,
      wordBankId: null,
      createdAt: new Date(),
      startTime: new Date(),
      endTime: null,
      score: null,
      lastFetchedWordId: null,
      questionSetId: null,
      wordBank: null
    };

    vi.mocked(prisma.practiceSession.findUnique).mockResolvedValue(mockSession);

    await expect(cloneSession('session1')).rejects.toThrow(
      'Session must have a word bank to clone'
    );
  });
});