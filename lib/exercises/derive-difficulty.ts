// Reine, server-seitige Helper zur Ableitung der Schwierigkeit aus Operanden.
// Bewusst KEINE "use server"-Datei — diese Funktionen sind synchron und werden
// sowohl aus Server-Actions als auch in Unit-Tests importiert.

import { RANGES } from "./config";
import { hasCarry, hasBorrow } from "./generators";
import type { Difficulty, Grade, Operator } from "./types";
import type { ExerciseFocus } from "./focus";

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];

/**
 * Validate that submitted operands are plausible for the child's grade and difficulty.
 * Prevents trivial-exercise forgery (CR-01) without requiring server-side exercise storage.
 */
export function validateOperandsForGrade(
  operand1: number,
  operand2: number,
  operator: Operator,
  grade: Grade,
  difficulty: Difficulty
): boolean {
  const config = RANGES[grade][difficulty];

  // Operator must be allowed for this grade/difficulty
  if (!config.operators.includes(operator)) {
    return false;
  }

  // Operanden muessen im operator-spezifischen Bereich liegen.
  switch (operator) {
    case "+": {
      const { min, max } = config.addSub;
      if (operand1 < min || operand1 > max || operand2 < min || operand2 > max) {
        return false;
      }
      // hard verlangt einen echten Zehneruebergang (C1-Fix)
      if (config.requireCarry && !hasCarry(operand1, operand2)) return false;
      return true;
    }

    case "-": {
      const { min, max } = config.addSub;
      if (operand1 < min || operand1 > max || operand2 < min || operand2 > max) {
        return false;
      }
      if (operand1 < operand2) return false; // keine negativen Ergebnisse
      if (config.requireCarry && !hasBorrow(operand1, operand2)) return false;
      return true;
    }

    case "*": {
      // factor1/factor2 sind getrennt; die Reihenfolge der Operanden ist
      // jedoch nicht garantiert -> beide Zuordnungen pruefen.
      const { factor1, factor2 } = config.mulDiv;
      const fits = (x: number, y: number) =>
        x >= factor1.min && x <= factor1.max && y >= factor2.min && y <= factor2.max;
      return fits(operand1, operand2) || fits(operand2, operand1);
    }

    case "/": {
      // Answer-first: dividend = quotient * divisor.
      // Divisor (operand2) muss >= 2 und im factor2-Bereich liegen,
      // der Quotient muss im factor1-Bereich liegen, Rest muss 0 sein.
      const { factor1, factor2 } = config.mulDiv;
      if (operand2 < Math.max(2, factor2.min) || operand2 > factor2.max) {
        return false;
      }
      if (operand1 % operand2 !== 0) return false;
      const quotient = operand1 / operand2;
      if (quotient < Math.max(1, factor1.min) || quotient > factor1.max) {
        return false;
      }
      return true;
    }
  }
}

/**
 * D1 — Punkte-Manipulation: Leitet die *tatsaechliche* Schwierigkeit aus den
 * uebermittelten Operanden ab, statt dem Client-Wert `currentDifficulty` zu
 * vertrauen. Ohne serverseitige Aufgaben-Persistenz ist das die pragmatischste
 * robuste Loesung.
 *
 * Wir pruefen von "easy" aufwaerts und nehmen die *niedrigste* passende Stufe —
 * so kann ein Kind fuer eine triviale 1+1-Aufgabe keine 30 Hard-Punkte mehr
 * erschwindeln (1+1 faellt nur in "easy").
 *
 * Liefert `null`, wenn die Operanden zu keiner Stufe der Klassenstufe passen.
 */
export function deriveDifficultyFromOperands(
  operand1: number,
  operand2: number,
  operator: Operator,
  grade: Grade
): Difficulty | null {
  for (const difficulty of DIFFICULTY_ORDER) {
    if (validateOperandsForGrade(operand1, operand2, operator, grade, difficulty)) {
      return difficulty;
    }
  }
  return null;
}

/**
 * D1 — Fokus-Modus: Die Schwierigkeit ergibt sich aus dem Fokus selbst, nicht
 * aus einem Client-Wert. Einmaleins / Dividieren zaehlen als "medium",
 * Plus/Minus bis 1000 als "hard", bis 100 als "medium", sonst "easy".
 */
export function deriveDifficultyFromFocus(focus: ExerciseFocus): Difficulty {
  switch (focus.kind) {
    case "times_table":
    case "divide_by":
      return "medium";
    case "add_up_to":
    case "sub_up_to":
      if (focus.max >= 1000) return "hard";
      if (focus.max >= 100) return "medium";
      return "easy";
  }
}
