import { describe, it, expect } from "vitest";
import {
  generateFocusedExercise,
  validateOperandsForFocus,
  isValidFocus,
  focusOperator,
  type ExerciseFocus,
} from "@/lib/exercises/focus";

describe("isValidFocus", () => {
  it("akzeptiert ein gueltiges Einmaleins-Fokus", () => {
    expect(isValidFocus({ kind: "times_table", factor: 7 })).toBe(true);
  });

  it("lehnt einen Faktor ausserhalb 1..12 ab", () => {
    expect(isValidFocus({ kind: "times_table", factor: 0 })).toBe(false);
    expect(isValidFocus({ kind: "times_table", factor: 13 })).toBe(false);
  });

  it("akzeptiert nur erlaubte max-Werte fuer add_up_to", () => {
    expect(isValidFocus({ kind: "add_up_to", max: 20 })).toBe(true);
    expect(isValidFocus({ kind: "add_up_to", max: 33 })).toBe(false);
  });

  it("lehnt unbekannte oder leere Eingaben ab", () => {
    expect(isValidFocus(null)).toBe(false);
    expect(isValidFocus({ kind: "noop" })).toBe(false);
  });
});

describe("focusOperator", () => {
  it("ordnet jedem Fokus den korrekten Operator zu", () => {
    expect(focusOperator({ kind: "times_table", factor: 3 })).toBe("*");
    expect(focusOperator({ kind: "divide_by", factor: 3 })).toBe("/");
    expect(focusOperator({ kind: "add_up_to", max: 20 })).toBe("+");
    expect(focusOperator({ kind: "sub_up_to", max: 20 })).toBe("-");
  });
});

describe("generateFocusedExercise", () => {
  it("times_table: enthaelt immer den Fokus-Faktor und ist korrekt geloest", () => {
    const focus: ExerciseFocus = { kind: "times_table", factor: 7 };
    for (let i = 0; i < 50; i++) {
      const ex = generateFocusedExercise(focus);
      expect(ex.operator).toBe("*");
      expect(ex.operand1 === 7 || ex.operand2 === 7).toBe(true);
      expect(ex.correctAnswer).toBe(ex.operand1 * ex.operand2);
      expect(validateOperandsForFocus(ex.operand1, ex.operand2, "*", focus)).toBe(
        true
      );
    }
  });

  it("divide_by: ist immer ohne Rest teilbar und vom Fokus-Faktor", () => {
    const focus: ExerciseFocus = { kind: "divide_by", factor: 4 };
    for (let i = 0; i < 50; i++) {
      const ex = generateFocusedExercise(focus);
      expect(ex.operator).toBe("/");
      expect(ex.operand2).toBe(4);
      expect(ex.operand1 % 4).toBe(0);
      expect(ex.correctAnswer).toBe(ex.operand1 / ex.operand2);
      expect(validateOperandsForFocus(ex.operand1, ex.operand2, "/", focus)).toBe(
        true
      );
    }
  });

  it("add_up_to: Summe bleibt innerhalb des Maximums", () => {
    const focus: ExerciseFocus = { kind: "add_up_to", max: 20 };
    for (let i = 0; i < 50; i++) {
      const ex = generateFocusedExercise(focus);
      expect(ex.operator).toBe("+");
      expect(ex.operand1 + ex.operand2).toBeLessThanOrEqual(20);
      expect(ex.correctAnswer).toBe(ex.operand1 + ex.operand2);
      expect(validateOperandsForFocus(ex.operand1, ex.operand2, "+", focus)).toBe(
        true
      );
    }
  });

  it("sub_up_to: Ergebnis ist nie negativ", () => {
    const focus: ExerciseFocus = { kind: "sub_up_to", max: 50 };
    for (let i = 0; i < 50; i++) {
      const ex = generateFocusedExercise(focus);
      expect(ex.operator).toBe("-");
      expect(ex.operand1).toBeGreaterThanOrEqual(ex.operand2);
      expect(ex.correctAnswer).toBe(ex.operand1 - ex.operand2);
      expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
      expect(validateOperandsForFocus(ex.operand1, ex.operand2, "-", focus)).toBe(
        true
      );
    }
  });
});

describe("validateOperandsForFocus", () => {
  it("lehnt einen falschen Operator ab", () => {
    expect(
      validateOperandsForFocus(7, 3, "+", { kind: "times_table", factor: 7 })
    ).toBe(false);
  });

  it("times_table: lehnt eine Aufgabe ohne den Fokus-Faktor ab", () => {
    expect(
      validateOperandsForFocus(3, 4, "*", { kind: "times_table", factor: 7 })
    ).toBe(false);
  });

  it("divide_by: lehnt einen nicht teilbaren Dividenden ab", () => {
    expect(
      validateOperandsForFocus(10, 4, "/", { kind: "divide_by", factor: 4 })
    ).toBe(false);
  });

  it("add_up_to: lehnt eine Summe ueber dem Maximum ab", () => {
    expect(
      validateOperandsForFocus(15, 10, "+", { kind: "add_up_to", max: 20 })
    ).toBe(false);
  });

  it("sub_up_to: lehnt ein negatives Ergebnis ab", () => {
    expect(
      validateOperandsForFocus(3, 9, "-", { kind: "sub_up_to", max: 20 })
    ).toBe(false);
  });
});
