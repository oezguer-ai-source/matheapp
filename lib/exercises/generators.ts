// lib/exercises/generators.ts
// Reine Generator-Funktion fuer alle 4 Klassenstufen mit 3 Schwierigkeitsstufen.
//
// C1/C2-Audit-Fix:
//  - operator-spezifische Ranges aus config.ts (addSub vs. mulDiv)
//  - `requireCarry`: hard erzwingt einen echten Zehneruebergang

import { type Exercise, type Difficulty, type Grade, type Operator } from './types';
import { RANGES, type RangeConfig, type OperandRange } from './config';

/**
 * Erzeugt eine zufaellige Ganzzahl im inklusiven Bereich [min, max].
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Berechnet das Ergebnis einer Rechenoperation.
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
 * Prueft, ob eine Addition `a + b` einen Zehneruebergang (Carry) hat,
 * d.h. die Einerstellen zusammen >= 10 ergeben.
 */
export function hasCarry(a: number, b: number): boolean {
  return (a % 10) + (b % 10) >= 10;
}

/**
 * Prueft, ob eine Subtraktion `a - b` einen Zehneruebergang (Borrow) hat,
 * d.h. die Einerstelle des Minuenden kleiner ist als die des Subtrahenden.
 */
export function hasBorrow(a: number, b: number): boolean {
  return (a % 10) < (b % 10);
}

/**
 * Waehlt einen zufaelligen Operator aus den erlaubten Operatoren.
 */
function pickOperator(config: RangeConfig): Operator {
  const operators = config.operators;
  return operators[randomInt(0, operators.length - 1)];
}

/**
 * Erzeugt Operanden passend zu Operator und Range-Konfiguration.
 *
 * Wichtige Bedingungen:
 *  - Subtraktion: operand1 >= operand2 (keine negativen Ergebnisse)
 *  - Division: answer-first -> garantiert ganzzahlige Ergebnisse, Divisor >= 2
 *  - requireCarry: bei +/- wird ein echter Zehneruebergang erzwungen
 */
function generateOperands(
  operator: Operator,
  config: RangeConfig
): { operand1: number; operand2: number } {
  switch (operator) {
    case '+':
      return generateAddition(config.addSub, config.requireCarry);
    case '-':
      return generateSubtraction(config.addSub, config.requireCarry);
    case '*':
      return generateMultiplication(config.mulDiv.factor1, config.mulDiv.factor2);
    case '/':
      return generateDivision(config.mulDiv.factor1, config.mulDiv.factor2);
  }
}

/** Maximale Versuche, eine Carry-/Borrow-Bedingung zu erfuellen, bevor abgebrochen wird. */
const MAX_ATTEMPTS = 60;

function generateAddition(
  range: OperandRange,
  requireCarry: boolean
): { operand1: number; operand2: number } {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const a = randomInt(range.min, range.max);
    const b = randomInt(range.min, range.max);
    if (!requireCarry || hasCarry(a, b)) {
      return { operand1: a, operand2: b };
    }
  }
  // Fallback: konstruiere garantiert einen Zehneruebergang.
  const a = randomInt(range.min, range.max);
  const aOnes = a % 10;
  // b-Einer so waehlen, dass aOnes + bOnes >= 10
  const minBOnes = Math.max(1, 10 - aOnes);
  const bOnes = randomInt(minBOnes, 9);
  // b-Zehner moeglichst im Bereich halten
  const maxBTens = Math.max(0, Math.floor((range.max - bOnes) / 10));
  const bTens = randomInt(0, maxBTens);
  const b = Math.max(range.min, bTens * 10 + bOnes);
  return { operand1: a, operand2: b };
}

function generateSubtraction(
  range: OperandRange,
  requireBorrow: boolean
): { operand1: number; operand2: number } {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    let a = randomInt(range.min, range.max);
    let b = randomInt(range.min, range.max);
    if (a < b) [a, b] = [b, a];
    if (!requireBorrow || hasBorrow(a, b)) {
      return { operand1: a, operand2: b };
    }
  }
  // Fallback: konstruiere garantiert einen Borrow (a-Einer < b-Einer).
  let a = randomInt(range.min, range.max);
  let b = randomInt(range.min, range.max);
  if (a < b) [a, b] = [b, a];
  const aOnes = a % 10;
  const aTens = Math.floor(a / 10);
  if (aTens >= 1 && b % 10 <= aOnes) {
    // b-Einer auf einen Wert groesser als aOnes anheben
    const bOnes = randomInt(aOnes + 1, 9);
    const bBase = Math.min(Math.floor(b / 10) * 10 + bOnes, a - 1);
    b = Math.max(range.min, bBase);
  }
  if (a < b) [a, b] = [b, a];
  return { operand1: a, operand2: b };
}

function generateMultiplication(
  f1: OperandRange,
  f2: OperandRange
): { operand1: number; operand2: number } {
  return {
    operand1: randomInt(f1.min, f1.max),
    operand2: randomInt(f2.min, f2.max),
  };
}

function generateDivision(
  f1: OperandRange,
  f2: OperandRange
): { operand1: number; operand2: number } {
  // Answer-first: Quotient (f1) und Divisor (f2) waehlen, Dividend berechnen.
  // Divisor >= 2, um Division durch 0 und triviale /1 zu vermeiden.
  const divisor = randomInt(Math.max(2, f2.min), Math.max(2, f2.max));
  const quotient = randomInt(Math.max(1, f1.min), Math.max(1, f1.max));
  const dividend = quotient * divisor;
  return { operand1: dividend, operand2: divisor };
}

/**
 * Erzeugt eine einzelne Aufgabe fuer die gegebene Klassenstufe und Schwierigkeit.
 */
export function generateExercise(grade: number, difficulty: Difficulty): Exercise {
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
