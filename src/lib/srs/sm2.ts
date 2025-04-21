// Enhanced SM-2 algorithm implementation with priority scoring
// easeChosen: 1=Again, 2=Hard, 3=Good, 4=Easy

interface WordSrsData {
  repetitions: number;
  easeFactor: number | null;
  interval: number;
  isStarred: boolean;
  sampleSentences: string[];
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

export function calculateNextReview(wordSrsData: WordSrsData, easeChosen: number): SrsUpdate {
  let { repetitions, easeFactor, interval, isStarred, sampleSentences, successRate } = wordSrsData;

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
  
  // Adjust based on sample sentence usage
  priorityScore *= 1 + ((sampleSentences?.length ?? 0) * SENTENCE_USAGE_FACTOR);
  
  // Adjust based on recent success rate
  priorityScore *= 0.5 + (successRate / 2);

  // Calculate next review date with priority adjustment
  const now = new Date();
  const nextReviewDate = new Date(now);
  const daysToAdd = Math.max(1, Math.floor(interval / priorityScore));
  if (isNaN(daysToAdd) || !isFinite(daysToAdd)) {
    nextReviewDate.setDate(now.getDate() + 1);
  } else {
    nextReviewDate.setDate(now.getDate() + daysToAdd);
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
