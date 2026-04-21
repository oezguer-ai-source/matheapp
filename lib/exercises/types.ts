// lib/exercises/types.ts
// Type definitions for the exercise engine
// Source: CONTEXT.md D-04, D-11

export type OperationType = 'addition' | 'subtraktion' | 'multiplikation' | 'division';
export type Operator = '+' | '-' | '*' | '/';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Grade = 1 | 2 | 3 | 4;

export interface Exercise {
  id: string;
  operand1: number;
  operand2: number;
  operator: Operator;
  correctAnswer: number;
}

// What the client receives (correctAnswer stripped to prevent cheating)
export interface ClientExercise {
  id: string;
  operand1: number;
  operand2: number;
  operator: Operator;
}

export interface SubmitAnswerResult {
  correct: boolean;
  correctAnswer: number;
  pointsEarned: number;
  newDifficulty: Difficulty;
  newCorrectStreak: number;
  newIncorrectStreak: number;
  avatar?: {
    levelUp: boolean;
    oldLevel: number;
    newLevel: number;
    xp: number;
    currentStreak: number;
  };
}

// Maps operator symbol to DB operation_type string (German names per DB schema)
export const OPERATOR_TO_TYPE: Record<Operator, OperationType> = {
  '+': 'addition',
  '-': 'subtraktion',
  '*': 'multiplikation',
  '/': 'division',
};
