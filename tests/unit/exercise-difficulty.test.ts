import { describe, it, expect } from 'vitest';
import { computeNewDifficulty, PROMOTE_THRESHOLD, DEMOTE_THRESHOLD } from '@/lib/exercises/difficulty';

describe('computeNewDifficulty', () => {
  it('should stay at easy when correctStreak < 3', () => {
    expect(computeNewDifficulty('easy', 2, 0)).toBe('easy');
  });

  it('should promote easy to medium after 3 correct', () => {
    expect(computeNewDifficulty('easy', 3, 0)).toBe('medium');
  });

  it('should promote medium to hard after 3 correct', () => {
    expect(computeNewDifficulty('medium', 3, 0)).toBe('hard');
  });

  it('should stay at hard when already at max', () => {
    expect(computeNewDifficulty('hard', 3, 0)).toBe('hard');
  });

  it('should demote medium to easy after 2 incorrect', () => {
    expect(computeNewDifficulty('medium', 0, 2)).toBe('easy');
  });

  it('should demote hard to medium after 2 incorrect', () => {
    expect(computeNewDifficulty('hard', 0, 2)).toBe('medium');
  });

  it('should stay at easy when already at min', () => {
    expect(computeNewDifficulty('easy', 0, 2)).toBe('easy');
  });

  it('should not change with mixed streaks', () => {
    expect(computeNewDifficulty('medium', 1, 1)).toBe('medium');
  });
});

describe('difficulty constants', () => {
  it('PROMOTE_THRESHOLD should be 3', () => {
    expect(PROMOTE_THRESHOLD).toBe(3);
  });

  it('DEMOTE_THRESHOLD should be 2', () => {
    expect(DEMOTE_THRESHOLD).toBe(2);
  });
});
