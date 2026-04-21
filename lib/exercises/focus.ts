import { randomInt } from "./generators";
import type { Exercise, Operator } from "./types";

export type ExerciseFocus =
  | { kind: "times_table"; factor: number }
  | { kind: "divide_by"; factor: number }
  | { kind: "add_up_to"; max: number }
  | { kind: "sub_up_to"; max: number };

export function isValidFocus(f: unknown): f is ExerciseFocus {
  if (!f || typeof f !== "object") return false;
  const obj = f as { kind?: string; factor?: number; max?: number };
  switch (obj.kind) {
    case "times_table":
    case "divide_by":
      return (
        typeof obj.factor === "number" &&
        Number.isInteger(obj.factor) &&
        obj.factor >= 1 &&
        obj.factor <= 12
      );
    case "add_up_to":
    case "sub_up_to":
      return (
        typeof obj.max === "number" &&
        Number.isInteger(obj.max) &&
        [10, 20, 50, 100, 1000].includes(obj.max)
      );
    default:
      return false;
  }
}

export function focusOperator(f: ExerciseFocus): Operator {
  switch (f.kind) {
    case "times_table":
      return "*";
    case "divide_by":
      return "/";
    case "add_up_to":
      return "+";
    case "sub_up_to":
      return "-";
  }
}

export function generateFocusedExercise(f: ExerciseFocus): Exercise {
  switch (f.kind) {
    case "times_table": {
      const other = randomInt(1, 10);
      const operand1 = Math.random() < 0.5 ? f.factor : other;
      const operand2 = operand1 === f.factor ? other : f.factor;
      return {
        id: crypto.randomUUID(),
        operand1,
        operand2,
        operator: "*",
        correctAnswer: operand1 * operand2,
      };
    }
    case "divide_by": {
      const quotient = randomInt(1, 10);
      const operand1 = f.factor * quotient;
      return {
        id: crypto.randomUUID(),
        operand1,
        operand2: f.factor,
        operator: "/",
        correctAnswer: quotient,
      };
    }
    case "add_up_to": {
      let a = randomInt(1, f.max - 1);
      let b = randomInt(1, f.max - a);
      if (a + b < 2) {
        a = 1;
        b = 1;
      }
      return {
        id: crypto.randomUUID(),
        operand1: a,
        operand2: b,
        operator: "+",
        correctAnswer: a + b,
      };
    }
    case "sub_up_to": {
      const a = randomInt(2, f.max);
      const b = randomInt(1, a);
      return {
        id: crypto.randomUUID(),
        operand1: a,
        operand2: b,
        operator: "-",
        correctAnswer: a - b,
      };
    }
  }
}

export function validateOperandsForFocus(
  operand1: number,
  operand2: number,
  operator: Operator,
  f: ExerciseFocus
): boolean {
  if (operator !== focusOperator(f)) return false;
  switch (f.kind) {
    case "times_table":
      return (
        (operand1 === f.factor && operand2 >= 1 && operand2 <= 10) ||
        (operand2 === f.factor && operand1 >= 1 && operand1 <= 10)
      );
    case "divide_by":
      return (
        operand2 === f.factor &&
        operand1 >= f.factor &&
        operand1 % f.factor === 0 &&
        operand1 / f.factor <= 10
      );
    case "add_up_to":
      return (
        operand1 >= 1 &&
        operand2 >= 1 &&
        operand1 + operand2 <= f.max
      );
    case "sub_up_to":
      return (
        operand1 >= 1 &&
        operand2 >= 1 &&
        operand1 >= operand2 &&
        operand1 <= f.max
      );
  }
}
