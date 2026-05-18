import { describe, it, expect } from "vitest";
import {
  deriveDifficultyFromOperands,
  deriveDifficultyFromFocus,
  validateOperandsForGrade,
} from "@/lib/exercises/derive-difficulty";
import { calculatePoints } from "@/lib/exercises/points";
import type { ExerciseFocus } from "@/lib/exercises/focus";

describe("deriveDifficultyFromOperands — Punkte-Manipulation (D1)", () => {
  it("eine triviale 1+1-Aufgabe faellt auf 'easy', auch wenn der Client 'hard' behauptet", () => {
    // Klasse 1: easy 1..10, hard 5..20. 1+1 passt nur in easy.
    const derived = deriveDifficultyFromOperands(1, 1, "+", 1);
    expect(derived).toBe("easy");
  });

  it("liefert daraus die niedrigste Punktzahl (10), nicht die Hard-Punkte (30)", () => {
    const derived = deriveDifficultyFromOperands(1, 1, "+", 1);
    expect(derived).not.toBeNull();
    expect(calculatePoints(true, derived!)).toBe(10);
  });

  it("nimmt die niedrigste passende Stufe, wenn mehrere Stufen passen", () => {
    // Klasse 1: 8+9 passt in easy(1..10), medium(1..20) UND hard(5..20).
    // Erwartung: easy gewinnt -> 10 Punkte.
    expect(deriveDifficultyFromOperands(8, 9, "+", 1)).toBe("easy");
  });

  it("erkennt eine echte Hard-Aufgabe, die nur in 'hard' passt", () => {
    // Klasse 1: nur hard erlaubt 5..20 ohne Untergrenze-Konflikt;
    // 15-12 liegt ausserhalb easy(1..10), in medium(1..20) und hard(5..20).
    // medium ist niedriger -> medium.
    expect(deriveDifficultyFromOperands(15, 12, "-", 1)).toBe("medium");
  });

  it("liefert null fuer Operanden, die zu keiner Stufe der Klasse passen", () => {
    // Klasse 1 erlaubt nur + und -, kein *.
    expect(deriveDifficultyFromOperands(3, 4, "*", 1)).toBeNull();
  });

  it("liefert null fuer ein negatives Subtraktions-Ergebnis", () => {
    expect(deriveDifficultyFromOperands(2, 9, "-", 1)).toBeNull();
  });
});

describe("validateOperandsForGrade", () => {
  it("akzeptiert eine teilbare Einmaleins-Division fuer Klasse 3 medium", () => {
    // 56 / 8 = 7: Divisor 8 in factor2 [2,10], Quotient 7 in factor1 [2,10]
    expect(validateOperandsForGrade(56, 8, "/", 3, "medium")).toBe(true);
  });

  it("akzeptiert eine grosse-Einmaleins-Division fuer Klasse 3 hard", () => {
    // 96 / 8 = 12: Divisor 8 in factor2 [6,12], Quotient 12 in factor1 [6,12]
    expect(validateOperandsForGrade(96, 8, "/", 3, "hard")).toBe(true);
  });

  it("lehnt eine Division mit Rest ab", () => {
    expect(validateOperandsForGrade(41, 8, "/", 3, "hard")).toBe(false);
  });

  it("lehnt einen fuer die Klasse unzulaessigen Operator ab", () => {
    expect(validateOperandsForGrade(3, 4, "*", 1, "easy")).toBe(false);
  });

  it("C1: hard verlangt einen echten Zehneruebergang bei Addition", () => {
    // 12+3 hat keinen Zehneruebergang -> nicht hard, obwohl im Zahlenraum
    expect(validateOperandsForGrade(12, 3, "+", 1, "hard")).toBe(false);
    // 8+7 hat einen Zehneruebergang -> hard
    expect(validateOperandsForGrade(8, 7, "+", 1, "hard")).toBe(true);
  });

  it("C1: hard verlangt einen echten Zehneruebergang bei Subtraktion", () => {
    expect(validateOperandsForGrade(15, 2, "-", 1, "hard")).toBe(false);
    expect(validateOperandsForGrade(13, 6, "-", 1, "hard")).toBe(true);
  });

  it("C2: Klasse 4 Multiplikation lehnt absurd grosse Faktoren ab", () => {
    // 500 x 500 liegt weit ausserhalb der lehrplangerechten Faktoren
    expect(validateOperandsForGrade(500, 500, "*", 4, "hard")).toBe(false);
    // zweistellig x einstellig ist gueltig
    expect(validateOperandsForGrade(45, 6, "*", 4, "hard")).toBe(true);
  });
});

describe("deriveDifficultyFromFocus", () => {
  it("Einmaleins zaehlt als 'medium'", () => {
    const f: ExerciseFocus = { kind: "times_table", factor: 7 };
    expect(deriveDifficultyFromFocus(f)).toBe("medium");
  });

  it("Dividieren zaehlt als 'medium'", () => {
    const f: ExerciseFocus = { kind: "divide_by", factor: 4 };
    expect(deriveDifficultyFromFocus(f)).toBe("medium");
  });

  it("Plus bis 20 zaehlt als 'easy'", () => {
    const f: ExerciseFocus = { kind: "add_up_to", max: 20 };
    expect(deriveDifficultyFromFocus(f)).toBe("easy");
  });

  it("Plus bis 100 zaehlt als 'medium'", () => {
    const f: ExerciseFocus = { kind: "add_up_to", max: 100 };
    expect(deriveDifficultyFromFocus(f)).toBe("medium");
  });

  it("Minus bis 1000 zaehlt als 'hard'", () => {
    const f: ExerciseFocus = { kind: "sub_up_to", max: 1000 };
    expect(deriveDifficultyFromFocus(f)).toBe("hard");
  });
});
