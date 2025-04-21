import { prisma } from '../../lib/db/prisma';

/**
 * Clones a completed practice session with all its settings and words
 * @param originalSessionId The ID of the session to clone
 * @returns The new cloned session
 */
export async function cloneSession(originalSessionId: string) {
  // Get the original session with its words and practice logs
  const originalSession = await prisma.practiceSession.findUnique({
    where: { id: originalSessionId },
    include: {
      wordBank: {
        include: {
          words: {
            include: {
              practiceLogs: {
                orderBy: {
                  timestamp: 'desc'
                },
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

  if (!originalSession) {
    throw new Error('Session not found');
  }

  if (!originalSession.wordBank) {
    throw new Error('Session must have a word bank to clone');
  }

  // Create new session with same settings
  const newSession = await prisma.practiceSession.create({
    data: {
      userId: originalSession.userId,
      type: originalSession.type,
      difficulty: originalSession.difficulty,
      wordBankId: originalSession.wordBankId,
      // Reset timestamps and completion status
      startTime: new Date(),
      endTime: null,
      score: null
    }
  });

  // Clone all words with their current state but reset SRS stats
  const wordsToClone = originalSession.wordBank.words.map(word => ({
    wordBankId: newSession.wordBankId!,
    wordMasterId: word.wordMasterId,
    text: word.text,
    isStarred: word.isStarred,
    notes: word.notes,
    // Get sample sentences from wordMaster
    sampleSentences: word.wordMaster?.sampleSentences || [],
    // Reset SRS stats
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewDate: new Date(),
    mastery: 0,
    nextDueAtReviewCount: 0,
    timesSeen: 0,
    successRate: 0
  }));

  await prisma.word.createMany({
    data: wordsToClone
  });

  return newSession;
}