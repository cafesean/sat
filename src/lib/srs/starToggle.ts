import type { Word } from '@prisma/client';
import { prisma } from '../db/prisma';

/**
 * Toggles the star status of a word
 * @param wordId The ID of the word to toggle
 * @returns The updated word
 */
export async function toggleWordStar(wordId: string): Promise<Word> {
  // Get current star status
  const word = await prisma.word.findUnique({
    where: { id: wordId }
  });

  if (!word) {
    throw new Error('Word not found');
  }

  // Toggle the star status
  return await prisma.word.update({
    where: { id: wordId },
    data: { isStarred: !word.isStarred }
  });
}

/**
 * Gets all starred words for a user
 * @param userId The ID of the user
 * @returns Array of starred words
 */
export async function getStarredWords(userId: string): Promise<Word[]> {
  return await prisma.word.findMany({
    where: { 
      wordBank: { userId },
      isStarred: true 
    }
  });
}