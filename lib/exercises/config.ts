// lib/exercises/config.ts
// Number range configuration per grade and difficulty
// Source: CONTEXT.md D-05 through D-14

import { type Difficulty, type Grade, type Operator } from './types';

export interface RangeConfig {
  min: number;
  max: number;
  operators: Operator[];
}

export const RANGES: Record<Grade, Record<Difficulty, RangeConfig>> = {
  1: {
    easy:   { min: 1, max: 10, operators: ['+', '-'] },
    medium: { min: 1, max: 20, operators: ['+', '-'] },
    hard:   { min: 5, max: 20, operators: ['+', '-'] },
  },
  2: {
    easy:   { min: 1, max: 50, operators: ['+', '-'] },
    medium: { min: 1, max: 100, operators: ['+', '-'] },
    hard:   { min: 20, max: 100, operators: ['+', '-'] },
  },
  3: {
    easy:   { min: 1, max: 5, operators: ['*', '/'] },
    medium: { min: 1, max: 10, operators: ['*', '/'] },
    hard:   { min: 2, max: 10, operators: ['*', '/'] },
  },
  4: {
    easy:   { min: 1, max: 100, operators: ['+', '-', '*', '/'] },
    medium: { min: 1, max: 500, operators: ['+', '-', '*', '/'] },
    hard:   { min: 50, max: 1000, operators: ['+', '-', '*', '/'] },
  },
};
