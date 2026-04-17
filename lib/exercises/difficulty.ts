// lib/exercises/difficulty.ts
// Difficulty transition logic
// Source: CONTEXT.md D-15 (3 correct -> promote), D-16 (2 incorrect -> demote)

import { type Difficulty } from './types';

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

/** Number of consecutive correct answers needed to advance to the next difficulty */
export const PROMOTE_THRESHOLD = 3;

/** Number of consecutive incorrect answers needed to regress to the previous difficulty */
export const DEMOTE_THRESHOLD = 2;

/**
 * Compute the new difficulty based on the current difficulty and streak counts.
 * - Promotes after PROMOTE_THRESHOLD consecutive correct answers (max: hard)
 * - Demotes after DEMOTE_THRESHOLD consecutive incorrect answers (min: easy)
 * - Otherwise stays at the current difficulty
 */
export function computeNewDifficulty(
  currentDifficulty: Difficulty,
  correctStreak: number,
  incorrectStreak: number
): Difficulty {
  const currentIndex = DIFFICULTY_ORDER.indexOf(currentDifficulty);

  // Promote if enough consecutive correct answers and not at max
  if (correctStreak >= PROMOTE_THRESHOLD && currentIndex < DIFFICULTY_ORDER.length - 1) {
    return DIFFICULTY_ORDER[currentIndex + 1];
  }

  // Demote if enough consecutive incorrect answers and not at min
  if (incorrectStreak >= DEMOTE_THRESHOLD && currentIndex > 0) {
    return DIFFICULTY_ORDER[currentIndex - 1];
  }

  return currentDifficulty;
}
