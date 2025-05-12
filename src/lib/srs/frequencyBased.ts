/**
 * Frequency-based spaced repetition system implementation
 * - Based on review count progress rather than calendar time
 * - Simpler, more predictable implementation
 */

// Define intervals for different mastery levels
// These define how many review events to wait before showing the word again
const INTERVALS = [1, 3, 5, 10, 20, 40];
const MAX_MASTERY = INTERVALS.length - 1;

interface WordData {
  id: string;
  mastery: number;
  nextDueAtReviewCount: number;
  timesSeen: number;
  successRate: number;
  isStarred?: boolean;
}

/**
 * Prioritizes words for review based on mastery level, due count, and success rate
 * @param words Array of words to prioritize
 * @param currentReviewCount Current review count of the word bank
 * @returns Sorted array of words by priority
 */
export function prioritizeWordsFrequency(
  words: WordData[],
  currentReviewCount: number
): WordData[] {
  // Score and sort the words
  const scoredWords = words.map(word => {
    // How many reviews overdue (negative if not due yet)
    const overdueCount = currentReviewCount - word.nextDueAtReviewCount;
    
    // Calculate priority score
    let priorityScore = 0;
    
    // Highest priority for overdue words
    if (overdueCount >= 0) {
      priorityScore += 1000 + overdueCount;
    }
    
    // Priority based on mastery level (lower mastery = higher priority)
    priorityScore += 100 * (MAX_MASTERY - word.mastery);
    
    // Priority boost for lower success rate words
    priorityScore += 10 * (1 - word.successRate);
    
    // Priority boost for starred words
    if (word.isStarred) {
      priorityScore += 50;
    }
    
    return { ...word, priorityScore };
  });
  
  // Sort by priority score (descending)
  return scoredWords.sort((a, b) => 
    (b as any).priorityScore - (a as any).priorityScore
  );
}

/**
 * Calculates the next due review count for a word based on its current mastery
 * @param currentMastery Current mastery level of the word
 * @param currentReviewCount Current review count of the word bank 
 * @returns Next due review count
 */
export function calculateNextDueCount(
  currentMastery: number,
  currentReviewCount: number
): number {
  // Ensure mastery is within valid range
  const mastery = Math.max(0, Math.min(currentMastery, MAX_MASTERY));
  
  // Get the interval for this mastery level
  const interval = INTERVALS[mastery];
  
  // Calculate next due review count
  return currentReviewCount + interval;
}

/**
 * Returns an array of the interval steps for reference
 */
export function getIntervals(): number[] {
  return [...INTERVALS];
}

/**
 * Returns the maximum mastery level
 */
export function getMaxMastery(): number {
  return MAX_MASTERY;
} 