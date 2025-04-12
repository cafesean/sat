// Simplified SM-2 algorithm implementation
// easeChosen: 1=Again, 2=Hard, 3=Good, 4=Easy

// Define the necessary properties from the Word model
interface WordSrsData {
  repetitions: number;
  easeFactor: number | null; // Schema allows null, handle it
  interval: number;
}

interface SrsUpdate {
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: Date;
}

// Default ease factor
const DEFAULT_EASE_FACTOR = 2.5;
// Minimum ease factor
const MIN_EASE_FACTOR = 1.3;

export function calculateNextReview(wordSrsData: WordSrsData, easeChosen: number): SrsUpdate {
  let { repetitions, easeFactor, interval } = wordSrsData;

  // Ensure easeFactor is initialized if null
  easeFactor = easeFactor ?? DEFAULT_EASE_FACTOR;

  if (easeChosen < 3) { // If response quality is low (Again/Hard)
    repetitions = 0; // Reset repetitions count
    interval = 1; // Reset interval to 1 day
  } else { // If response quality is good (Good/Easy)
    repetitions += 1; // Increment repetitions count

    if (repetitions === 1) {
      interval = 1; // First successful repetition
    } else if (repetitions === 2) {
      interval = 6; // Second successful repetition
    } else {
      // Subsequent repetitions: interval = previous interval * ease factor
      interval = Math.ceil(interval * easeFactor);
    }
  }

  // Update ease factor based on user feedback
  // Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  // where q is the quality of response (1-4 mapped to 0-5 scale for formula, simplified here)
  // Simplified adjustment:
  easeFactor = easeFactor + (0.1 - (4 - easeChosen) * (0.08 + (4 - easeChosen) * 0.02));

  // Clamp ease factor to minimum value
  if (easeFactor < MIN_EASE_FACTOR) {
    easeFactor = MIN_EASE_FACTOR;
  }

  // Calculate next review date
  const now = new Date();
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(now.getDate() + interval);
  // Set time to beginning of the day for consistency
  nextReviewDate.setHours(0, 0, 0, 0);

  return {
    interval,
    easeFactor,
    repetitions,
    nextReviewDate,
  };
}
