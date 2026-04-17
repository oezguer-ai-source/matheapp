// lib/exercises/points.ts
// Point calculation for exercise answers
// Source: CONTEXT.md D-18 (base 10), D-19 (multiplier), D-20 (0 for incorrect)

import { type Difficulty } from './types';

/** Base points awarded for a correct answer */
export const BASE_POINTS = 10;

/** Difficulty multiplier: easy=1x, medium=2x, hard=3x */
export const MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

/**
 * Calculate points earned for an answer.
 * Correct answers: BASE_POINTS * MULTIPLIER[difficulty]
 * Incorrect answers: always 0 (no penalty)
 */
export function calculatePoints(correct: boolean, difficulty: Difficulty): number {
  if (!correct) return 0;
  return BASE_POINTS * MULTIPLIER[difficulty];
}
