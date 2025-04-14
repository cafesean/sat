// Review-count based spaced repetition system
// Mastery levels: 0-5 (0=new, 5=mastered)
// Uses number of reviews between repetitions rather than calendar days

export type ReviewCountWord = {
  word: string;
  mastery: number;
  nextDueAtReviewCount: number;
  timesSeen: number;
  successRate: number;
};

// Intervals in number of reviews between repetitions
const intervals = [1, 3, 5, 10, 20, 40];

export function updateReviewCountWord(word: ReviewCountWord, correct: boolean): ReviewCountWord {
  if (correct) {
    word.mastery = Math.min(word.mastery + 1, intervals.length - 1);
  } else {
    word.mastery = Math.max(word.mastery - 1, 0);
  }

  word.timesSeen += 1;
  word.successRate = ((word.successRate * (word.timesSeen - 1)) + (correct ? 1 : 0)) / word.timesSeen;
  word.nextDueAtReviewCount += intervals[word.mastery];

  return word;
}

export function getDueWords(words: ReviewCountWord[], currentReviewCount: number): ReviewCountWord[] {
  return words.filter(w => w.nextDueAtReviewCount <= currentReviewCount);
}

export function initializeWord(word: string): ReviewCountWord {
  return {
    word,
    mastery: 0,
    nextDueAtReviewCount: 0,
    timesSeen: 0,
    successRate: 0
  };
}