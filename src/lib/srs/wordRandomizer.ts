import type { Word } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface WordWithMaster extends Word {
  wordMaster: {
    sampleSentences: string[];
  };
}

/**
 * Randomizes word order while respecting SRS priorities and star status
 * @param wordBankId The ID of the word bank to randomize
 * @returns Array of randomized words with their original order preserved
 */
export async function getRandomizedWords(wordBankId: string): Promise<WordWithMaster[]> {
  // Get all words from the bank with their SRS data and sample sentences
  const words = await prisma.word.findMany({
    where: { wordBankId },
    include: {
      wordMaster: {
        select: {
          sampleSentences: true
        }
      }
    },
    orderBy: [
      { nextReviewDate: 'asc' }, // Highest priority first
      { isStarred: 'desc' }, // Starred words first
      { mastery: 'asc' } // Lower mastery first
    ]
  });

  if (words.length === 0) {
    return [];
  }

  // Calculate weights for each word based on priority factors
  const weightedWords = words.map(word => {
    let weight = 1;
    
    // Starred words get higher weight
    if (word.isStarred) weight *= 2;
    
    // Lower mastery gets higher weight
    weight *= (1 + (1 - word.mastery));
    
    return { word, weight };
  });

  // Sort by calculated weight
  weightedWords.sort((a, b) => b.weight - a.weight);

  // Extract just the words in weighted order
  const prioritizedWords = weightedWords.map(w => w.word);

  // Randomize within priority tiers
  const randomized: WordWithMaster[] = [];
  let currentPriority = 0;
  let currentGroup: WordWithMaster[] = [];

  for (const word of prioritizedWords) {
    const priorityScore = Math.floor(word.mastery * 10) + (word.isStarred ? 10 : 0);
    
    if (priorityScore !== currentPriority) {
      if (currentGroup.length > 0) {
        randomized.push(...shuffleArray(currentGroup));
        currentGroup = [];
      }
      currentPriority = priorityScore;
    }
    
    currentGroup.push(word);
  }

  // Add the last group
  if (currentGroup.length > 0) {
    randomized.push(...shuffleArray(currentGroup));
  }

  return randomized;
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array: WordWithMaster[]): WordWithMaster[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}