import { calculateNextReview, prioritizeWords } from '@/lib/srs/sm2';
import { describe, expect, it } from 'vitest';

describe('SRS Priority Calculation', () => {
  const baseWord = {
    repetitions: 0,
    easeFactor: 2.5,
    interval: 1,
    isStarred: false,
    sampleSentence: null,
    successRate: 1.0
  };

  it('should reset interval for "Again" response (easeChosen=1)', () => {
    const result = calculateNextReview(baseWord, 1);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it('should increase interval for "Good" response (easeChosen=3)', () => {
    const result = calculateNextReview(baseWord, 3);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });

  it('should apply priority boost for starred words', () => {
    const starredWord = { ...baseWord, isStarred: true };
    const result = calculateNextReview(starredWord, 3);
    expect(result.priorityScore).toBeGreaterThan(1.0);
  });

  it('should prioritize words with more sample sentences higher', () => {
    const wordWithSentences = { 
      ...baseWord, 
      sampleSentence: 'Sample sentence'
    };
    const result = calculateNextReview(wordWithSentences, 3);
    expect(result.priorityScore).toBeGreaterThan(1.0);
  });

  it('should sort words by priority score', () => {
    const words = [
      { ...baseWord, successRate: 0.5 },
      { ...baseWord, isStarred: true },
      { ...baseWord, sampleSentence: 'Sample sentence' }
    ];
    const prioritized = prioritizeWords(words);
    expect(prioritized[0].isStarred).toBe(true);
    expect(prioritized[1].sampleSentence).toBe('Sample sentence');
    expect(prioritized[2].successRate).toBe(0.5);
  });
});