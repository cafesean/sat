// Enhanced SM-2 algorithm implementation with priority scoring
// easeChosen: 1=Again, 2=Hard, 3=Good, 4=Easy

interface WordSrsData {
  repetitions: number;
  easeFactor: number | null;
  interval: number;
  isStarred: boolean;
  sampleSentence: string | null; // Changed to singular and nullable
  successRate: number;
}

interface SrsUpdate {
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: Date;
  priorityScore: number;
}

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const STAR_PRIORITY_BOOST = 1.5;
const SENTENCE_USAGE_FACTOR = 0.1;
// Reduce max interval to prevent date overflow errors - ~15 years is still plenty
const MAX_INTERVAL_DAYS = 5475; // Cap at ~15 years instead of ~10 years or larger

export function calculateNextReview(wordSrsData: WordSrsData, easeChosen: number): SrsUpdate {
  let { repetitions, easeFactor, interval, isStarred, sampleSentence, successRate } = wordSrsData; // Corrected destructuring

  // Initialize easeFactor if null
  easeFactor = easeFactor ?? DEFAULT_EASE_FACTOR;

  // Calculate base interval using SM-2 algorithm
  if (easeChosen < 3) { // Again/Hard
    repetitions = 0;
    interval = 1;
  } else { // Good/Easy
    repetitions += 1;
    interval = repetitions === 1 ? 1 :
               repetitions === 2 ? 6 :
               Math.ceil(interval * easeFactor);
  }

  // Cap the interval to prevent date overflow errors - strictly enforce the max
  interval = Math.min(interval, MAX_INTERVAL_DAYS);

  // Adjust ease factor based on response
  easeFactor = Math.max(
    MIN_EASE_FACTOR,
    easeFactor + (0.1 - (4 - easeChosen) * (0.08 + (4 - easeChosen) * 0.02))
  );

  // Calculate priority score
  let priorityScore = 1.0;
  
  // Boost priority for starred words
  if (isStarred) {
    priorityScore *= STAR_PRIORITY_BOOST;
  }
  
  // Adjust based on sample sentence usage (check if it exists)
  if (sampleSentence) {
    priorityScore *= 1 + SENTENCE_USAGE_FACTOR; // Apply boost if sample sentence exists
  }
  
  // Adjust based on recent success rate
  priorityScore *= 0.5 + (successRate / 2);

  // Calculate next review date with priority adjustment
  const now = new Date();
  const nextReviewDate = new Date(now);
  let daysToAdd = Math.max(1, Math.floor(interval / priorityScore));
  
  // Extra safeguards against invalid dates - strictly enforce max
  daysToAdd = Math.min(MAX_INTERVAL_DAYS, daysToAdd || 1);
  
  // Safely set the date
  nextReviewDate.setDate(now.getDate() + daysToAdd);
  
  // Ensure the date is valid - failsafe
  if (isNaN(nextReviewDate.getTime())) {
    // If still invalid, just add 1 day as absolute fallback
    nextReviewDate.setTime(now.getTime() + (24 * 60 * 60 * 1000));
  }
  
  nextReviewDate.setHours(0, 0, 0, 0);

  return {
    interval,
    easeFactor,
    repetitions,
    nextReviewDate,
    priorityScore,
  };
}

/**
 * Calculates the priority order for words in a practice session
 * @param words Array of words with SRS data
 * @returns Sorted array of words by priority
 */
export function prioritizeWords(words: WordSrsData[]): WordSrsData[] {
  return words.map(word => {
    const priorityScore = calculateNextReview(word, 3).priorityScore;
    return { ...word, priorityScore };
  }).sort((a, b) => b.priorityScore - a.priorityScore);
}
