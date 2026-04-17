import { describe, it, expect } from 'vitest';
import { generateExerciseSchema, submitAnswerSchema } from '@/lib/schemas/exercise';

describe('generateExerciseSchema', () => {
  it('accepts valid input { grade: 1, difficulty: "easy" }', () => {
    const result = generateExerciseSchema.safeParse({ grade: 1, difficulty: 'easy' });
    expect(result.success).toBe(true);
  });

  it('accepts grade 4 with difficulty "hard"', () => {
    const result = generateExerciseSchema.safeParse({ grade: 4, difficulty: 'hard' });
    expect(result.success).toBe(true);
  });

  it('rejects grade 0', () => {
    const result = generateExerciseSchema.safeParse({ grade: 0, difficulty: 'easy' });
    expect(result.success).toBe(false);
  });

  it('rejects grade 5', () => {
    const result = generateExerciseSchema.safeParse({ grade: 5, difficulty: 'easy' });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer grade (1.5)', () => {
    const result = generateExerciseSchema.safeParse({ grade: 1.5, difficulty: 'easy' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid difficulty "extreme"', () => {
    const result = generateExerciseSchema.safeParse({ grade: 1, difficulty: 'extreme' });
    expect(result.success).toBe(false);
  });
});

describe('submitAnswerSchema', () => {
  const validInput = {
    exerciseId: '550e8400-e29b-41d4-a716-446655440000',
    operand1: 5,
    operand2: 3,
    operator: '+' as const,
    userAnswer: 8,
    currentDifficulty: 'easy' as const,
    correctStreak: 2,
    incorrectStreak: 0,
  };

  it('accepts valid complete input', () => {
    const result = submitAnswerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exerciseId).toBe(validInput.exerciseId);
      expect(result.data.operand1).toBe(5);
      expect(result.data.operand2).toBe(3);
      expect(result.data.operator).toBe('+');
      expect(result.data.userAnswer).toBe(8);
      expect(result.data.currentDifficulty).toBe('easy');
      expect(result.data.correctStreak).toBe(2);
      expect(result.data.incorrectStreak).toBe(0);
    }
  });

  it('rejects non-UUID exerciseId', () => {
    const result = submitAnswerSchema.safeParse({ ...validInput, exerciseId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects operand2 of 0 (division by zero guard)', () => {
    const result = submitAnswerSchema.safeParse({ ...validInput, operand2: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative correctStreak', () => {
    const result = submitAnswerSchema.safeParse({ ...validInput, correctStreak: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects negative incorrectStreak', () => {
    const result = submitAnswerSchema.safeParse({ ...validInput, incorrectStreak: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid operator "**"', () => {
    const result = submitAnswerSchema.safeParse({ ...validInput, operator: '**' });
    expect(result.success).toBe(false);
  });

  it('accepts zero for userAnswer (edge case: 0 is valid answer)', () => {
    const result = submitAnswerSchema.safeParse({ ...validInput, userAnswer: 0 });
    expect(result.success).toBe(true);
  });
});
