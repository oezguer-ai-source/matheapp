import { describe, it, expect } from 'vitest';
import { generateExercise, compute, randomInt } from '@/lib/exercises/generators';
import type { Grade, Difficulty } from '@/lib/exercises/types';

// UUID v4 format regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('grade 1', () => {
  it('easy: generates +/- with operands 1-10', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(1, 'easy');
      expect(ex.operand1).toBeGreaterThanOrEqual(1);
      expect(ex.operand1).toBeLessThanOrEqual(10);
      expect(ex.operand2).toBeGreaterThanOrEqual(1);
      expect(ex.operand2).toBeLessThanOrEqual(10);
      expect(['+', '-']).toContain(ex.operator);
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('medium: generates +/- with operands 1-20', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(1, 'medium');
      expect(ex.operand1).toBeGreaterThanOrEqual(1);
      expect(ex.operand1).toBeLessThanOrEqual(20);
      expect(ex.operand2).toBeGreaterThanOrEqual(1);
      expect(ex.operand2).toBeLessThanOrEqual(20);
      expect(['+', '-']).toContain(ex.operator);
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('hard: generates +/- with operands 5-20', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(1, 'hard');
      expect(ex.operand1).toBeGreaterThanOrEqual(5);
      expect(ex.operand1).toBeLessThanOrEqual(20);
      expect(ex.operand2).toBeGreaterThanOrEqual(5);
      expect(ex.operand2).toBeLessThanOrEqual(20);
      expect(['+', '-']).toContain(ex.operator);
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });
});

describe('grade 2', () => {
  it('easy: generates +/- with operands 1-50', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(2, 'easy');
      expect(ex.operand1).toBeGreaterThanOrEqual(1);
      expect(ex.operand1).toBeLessThanOrEqual(50);
      expect(ex.operand2).toBeGreaterThanOrEqual(1);
      expect(ex.operand2).toBeLessThanOrEqual(50);
      expect(['+', '-']).toContain(ex.operator);
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('medium: generates +/- with operands 1-100', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(2, 'medium');
      expect(ex.operand1).toBeGreaterThanOrEqual(1);
      expect(ex.operand1).toBeLessThanOrEqual(100);
      expect(ex.operand2).toBeGreaterThanOrEqual(1);
      expect(ex.operand2).toBeLessThanOrEqual(100);
      expect(['+', '-']).toContain(ex.operator);
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('hard: generates +/- with operands 20-100', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(2, 'hard');
      expect(ex.operand1).toBeGreaterThanOrEqual(20);
      expect(ex.operand1).toBeLessThanOrEqual(100);
      expect(ex.operand2).toBeGreaterThanOrEqual(20);
      expect(ex.operand2).toBeLessThanOrEqual(100);
      expect(['+', '-']).toContain(ex.operator);
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });
});

describe('grade 3', () => {
  it('easy: generates * or / with factors 1-5', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(3, 'easy');
      expect(['*', '/']).toContain(ex.operator);
      if (ex.operator === '*') {
        expect(ex.operand1).toBeGreaterThanOrEqual(1);
        expect(ex.operand1).toBeLessThanOrEqual(5);
        expect(ex.operand2).toBeGreaterThanOrEqual(1);
        expect(ex.operand2).toBeLessThanOrEqual(5);
      } else {
        // Division: operand2 (divisor) in range, result is whole number
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
        expect(ex.operand2).toBeLessThanOrEqual(5);
        expect(ex.correctAnswer).toBe(Math.floor(ex.correctAnswer)); // whole number
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('medium: generates * or / with factors 1-10 (Einmaleins)', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(3, 'medium');
      expect(['*', '/']).toContain(ex.operator);
      if (ex.operator === '*') {
        expect(ex.operand1).toBeGreaterThanOrEqual(1);
        expect(ex.operand1).toBeLessThanOrEqual(10);
        expect(ex.operand2).toBeGreaterThanOrEqual(1);
        expect(ex.operand2).toBeLessThanOrEqual(10);
      } else {
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
        expect(ex.operand2).toBeLessThanOrEqual(10);
        expect(ex.correctAnswer).toBe(Math.floor(ex.correctAnswer));
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('hard: generates * or / with factors 2-10', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(3, 'hard');
      expect(['*', '/']).toContain(ex.operator);
      if (ex.operator === '*') {
        expect(ex.operand1).toBeGreaterThanOrEqual(2);
        expect(ex.operand1).toBeLessThanOrEqual(10);
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
        expect(ex.operand2).toBeLessThanOrEqual(10);
      } else {
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
        expect(ex.operand2).toBeLessThanOrEqual(10);
        expect(ex.correctAnswer).toBe(Math.floor(ex.correctAnswer));
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });
});

describe('grade 4', () => {
  it('easy: generates +,-,*,/ with operands 1-100', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(4, 'easy');
      expect(['+', '-', '*', '/']).toContain(ex.operator);
      if (ex.operator === '/') {
        // Division: dividend can exceed config.max (quotient * divisor)
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
      } else {
        expect(ex.operand1).toBeGreaterThanOrEqual(1);
        expect(ex.operand1).toBeLessThanOrEqual(100);
        expect(ex.operand2).toBeGreaterThanOrEqual(1);
        expect(ex.operand2).toBeLessThanOrEqual(100);
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('medium: generates +,-,*,/ with operands 1-500', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(4, 'medium');
      expect(['+', '-', '*', '/']).toContain(ex.operator);
      if (ex.operator === '/') {
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
      } else {
        expect(ex.operand1).toBeGreaterThanOrEqual(1);
        expect(ex.operand1).toBeLessThanOrEqual(500);
        expect(ex.operand2).toBeGreaterThanOrEqual(1);
        expect(ex.operand2).toBeLessThanOrEqual(500);
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('hard: generates +,-,*,/ with operands 50-1000', () => {
    for (let i = 0; i < 50; i++) {
      const ex = generateExercise(4, 'hard');
      expect(['+', '-', '*', '/']).toContain(ex.operator);
      if (ex.operator === '/') {
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
      } else {
        expect(ex.operand1).toBeGreaterThanOrEqual(50);
        expect(ex.operand1).toBeLessThanOrEqual(1000);
        expect(ex.operand2).toBeGreaterThanOrEqual(50);
        expect(ex.operand2).toBeLessThanOrEqual(1000);
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });
});

describe('constraints', () => {
  it('no negatives: subtraction result is always >= 0', () => {
    for (let i = 0; i < 200; i++) {
      const grade = ([1, 2, 3, 4] as const)[Math.floor(Math.random() * 4)];
      const diff = (['easy', 'medium', 'hard'] as const)[Math.floor(Math.random() * 3)];
      const ex = generateExercise(grade, diff);
      if (ex.operator === '-') {
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('no remainders: division result is always a whole number', () => {
    for (let i = 0; i < 200; i++) {
      const grade = ([3, 4] as const)[Math.floor(Math.random() * 2)];
      const diff = (['easy', 'medium', 'hard'] as const)[Math.floor(Math.random() * 3)];
      const ex = generateExercise(grade, diff);
      if (ex.operator === '/') {
        expect(ex.correctAnswer).toBe(Math.floor(ex.correctAnswer));
      }
    }
  });

  it('no division by zero: divisor is always >= 2', () => {
    for (let i = 0; i < 200; i++) {
      const grade = ([3, 4] as const)[Math.floor(Math.random() * 2)];
      const diff = (['easy', 'medium', 'hard'] as const)[Math.floor(Math.random() * 3)];
      const ex = generateExercise(grade, diff);
      if (ex.operator === '/') {
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('exercise has UUID id', () => {
    const ex = generateExercise(1, 'easy');
    expect(ex.id).toMatch(UUID_REGEX);
  });
});

describe('compute helper', () => {
  it('computes 3 + 5 = 8', () => {
    expect(compute(3, 5, '+')).toBe(8);
  });

  it('computes 10 - 3 = 7', () => {
    expect(compute(10, 3, '-')).toBe(7);
  });

  it('computes 4 * 6 = 24', () => {
    expect(compute(4, 6, '*')).toBe(24);
  });

  it('computes 20 / 5 = 4', () => {
    expect(compute(20, 5, '/')).toBe(4);
  });
});

describe('randomInt', () => {
  it('returns values in inclusive range', () => {
    const values = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const val = randomInt(3, 7);
      expect(val).toBeGreaterThanOrEqual(3);
      expect(val).toBeLessThanOrEqual(7);
      values.add(val);
    }
    // With 1000 iterations, we should see all values 3-7
    expect(values.size).toBe(5);
  });
});
