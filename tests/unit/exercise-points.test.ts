import { describe, it, expect } from 'vitest';
import { calculatePoints, BASE_POINTS, MULTIPLIER } from '@/lib/exercises/points';

describe('calculatePoints', () => {
  it('correct easy answer = 10 points', () => {
    expect(calculatePoints(true, 'easy')).toBe(10);
  });

  it('correct medium answer = 20 points', () => {
    expect(calculatePoints(true, 'medium')).toBe(20);
  });

  it('correct hard answer = 30 points', () => {
    expect(calculatePoints(true, 'hard')).toBe(30);
  });

  it('incorrect answer = 0 points regardless of difficulty', () => {
    expect(calculatePoints(false, 'easy')).toBe(0);
    expect(calculatePoints(false, 'medium')).toBe(0);
    expect(calculatePoints(false, 'hard')).toBe(0);
  });
});

describe('point constants', () => {
  it('BASE_POINTS should be 10', () => {
    expect(BASE_POINTS).toBe(10);
  });

  it('MULTIPLIER should map easy=1, medium=2, hard=3', () => {
    expect(MULTIPLIER).toEqual({ easy: 1, medium: 2, hard: 3 });
  });
});
