// lib/exercises/generators.ts
// Pure function exercise generator for all 4 grades with 3 difficulty tiers
// Source: CONTEXT.md D-02 through D-10

import { type Exercise, type Difficulty, type Grade, type Operator } from './types';
import { RANGES, type RangeConfig } from './config';

/**
 * Generate a random integer in the inclusive range [min, max].
 * Pitfall 1: Math.floor(Math.random() * (max - min + 1)) + min ensures both ends inclusive.
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Compute the result of an arithmetic operation.
 */
export function compute(a: number, b: number, op: Operator): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return a / b;
  }
}

/**
 * Pick a random operator from the allowed operators for a given grade/difficulty.
 */
function pickOperator(config: RangeConfig): Operator {
  const operators = config.operators;
  return operators[randomInt(0, operators.length - 1)];
}

/**
 * Generate operands appropriate for the given operator and range config.
 *
 * Key constraints:
 * - Subtraction: operand1 >= operand2 to avoid negative results (D-10, Pattern 5)
 * - Division: answer-first approach to guarantee whole number results (D-09, Pattern 4)
 * - Division: divisor always >= 2 to avoid trivial / division-by-zero (Pitfall 2)
 */
function generateOperands(
  operator: Operator,
  config: RangeConfig
): { operand1: number; operand2: number } {
  switch (operator) {
    case '+': {
      const a = randomInt(config.min, config.max);
      const b = randomInt(config.min, config.max);
      return { operand1: a, operand2: b };
    }

    case '-': {
      // Generate both in range, then swap if needed so result >= 0
      let a = randomInt(config.min, config.max);
      let b = randomInt(config.min, config.max);
      if (a < b) [a, b] = [b, a];
      return { operand1: a, operand2: b };
    }

    case '*': {
      const a = randomInt(config.min, config.max);
      const b = randomInt(config.min, config.max);
      return { operand1: a, operand2: b };
    }

    case '/': {
      // Answer-first approach: pick divisor and quotient, compute dividend
      // Divisor range: [max(2, config.min), config.max] to avoid div-by-zero and trivial /1
      const minDivisor = Math.max(2, config.min);
      const maxDivisor = config.max;
      const divisor = randomInt(minDivisor, maxDivisor);

      // Quotient: at least 1, and dividend (quotient * divisor) should stay reasonable
      const maxQuotient = Math.max(1, Math.floor(config.max / divisor));
      const quotient = randomInt(1, maxQuotient);

      const dividend = quotient * divisor;
      return { operand1: dividend, operand2: divisor };
    }
  }
}

/**
 * Generate a single exercise for the given grade and difficulty.
 *
 * @param grade - The school grade (1-4)
 * @param difficulty - The difficulty tier ('easy' | 'medium' | 'hard')
 * @returns A complete Exercise object with UUID, operands, operator, and correct answer
 */
export function generateExercise(grade: number, difficulty: Difficulty): Exercise {
  // Validate grade
  if (grade < 1 || grade > 4 || !Number.isInteger(grade)) {
    throw new Error(`Invalid grade: ${grade}. Must be 1, 2, 3, or 4.`);
  }

  const config = RANGES[grade as Grade][difficulty];
  const operator = pickOperator(config);
  const { operand1, operand2 } = generateOperands(operator, config);
  const correctAnswer = compute(operand1, operand2, operator);

  return {
    id: crypto.randomUUID(),
    operand1,
    operand2,
    operator,
    correctAnswer,
  };
}
