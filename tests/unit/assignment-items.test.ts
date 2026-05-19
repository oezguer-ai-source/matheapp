import { describe, it, expect } from "vitest";
import {
  generateMathAssignmentItems,
  formatExerciseQuestion,
} from "@/lib/exercises/assignment-items";
import type { ExerciseFocus } from "@/lib/exercises/focus";
import type { Difficulty, Grade } from "@/lib/exercises/types";

// Parst eine Aufgabenzeile "a op b = ?" und berechnet das erwartete Ergebnis.
// Damit pruefen wir unabhaengig von correctNumber, dass die Frage korrekt ist.
function evalQuestion(question: string): number {
  const m = question.match(/^(\d+)\s+(.)\s+(\d+)\s+=\s+\?$/u);
  if (!m) throw new Error(`Unerwartetes Frageformat: ${question}`);
  const a = Number(m[1]);
  const b = Number(m[3]);
  switch (m[2]) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "·":
      return a * b;
    case ":":
      return a / b;
    default:
      throw new Error(`Unbekannter Operator: ${m[2]}`);
  }
}

describe("formatExerciseQuestion", () => {
  it("formatiert die vier Operatoren kindgerecht", () => {
    expect(
      formatExerciseQuestion({ id: "x", operand1: 7, operand2: 8, operator: "+", correctAnswer: 15 })
    ).toBe("7 + 8 = ?");
    expect(
      formatExerciseQuestion({ id: "x", operand1: 9, operand2: 3, operator: "-", correctAnswer: 6 })
    ).toBe("9 − 3 = ?");
    expect(
      formatExerciseQuestion({ id: "x", operand1: 6, operand2: 4, operator: "*", correctAnswer: 24 })
    ).toBe("6 · 4 = ?");
    expect(
      formatExerciseQuestion({ id: "x", operand1: 12, operand2: 3, operator: "/", correctAnswer: 4 })
    ).toBe("12 : 3 = ?");
  });
});

describe("generateMathAssignmentItems — Anzahl & Form", () => {
  it("erzeugt genau die geforderte Anzahl Items", () => {
    for (const count of [1, 5, 20, 50]) {
      const items = generateMathAssignmentItems({ count, grade: 2, difficulty: "medium" });
      expect(items).toHaveLength(count);
    }
  });

  it("setzt itemType 'math' und fortlaufende sortOrder", () => {
    const items = generateMathAssignmentItems({ count: 10, grade: 3, difficulty: "easy" });
    items.forEach((item, idx) => {
      expect(item.itemType).toBe("math");
      expect(item.sortOrder).toBe(idx);
      expect(item.question).toMatch(/= \?$/u);
    });
  });

  it("liefert keine options/correctOptions (math-Items sind reine Zahlenaufgaben)", () => {
    const items = generateMathAssignmentItems({ count: 3, grade: 1, difficulty: "easy" });
    for (const item of items) {
      expect(item).not.toHaveProperty("options");
      expect(item).not.toHaveProperty("correctOptions");
    }
  });
});

describe("generateMathAssignmentItems — correctNumber ist immer korrekt", () => {
  const grades: Grade[] = [1, 2, 3, 4];
  const difficulties: Difficulty[] = ["easy", "medium", "hard"];

  for (const grade of grades) {
    for (const difficulty of difficulties) {
      it(`Klasse ${grade} / ${difficulty}: correctNumber == Ergebnis der Frage`, () => {
        const items = generateMathAssignmentItems({ count: 30, grade, difficulty });
        for (const item of items) {
          expect(item.correctNumber).toBe(evalQuestion(item.question));
          expect(Number.isFinite(item.correctNumber)).toBe(true);
          expect(Number.isInteger(item.correctNumber)).toBe(true);
        }
      });
    }
  }
});

describe("generateMathAssignmentItems — gueltige Ranges pro Klasse", () => {
  it("Klasse 1: Ergebnisse und Operanden bleiben im Zahlenraum bis 20", () => {
    const items = generateMathAssignmentItems({ count: 40, grade: 1, difficulty: "medium" });
    for (const item of items) {
      const m = item.question.match(/^(\d+)\s+(.)\s+(\d+)/u)!;
      expect(Number(m[1])).toBeLessThanOrEqual(20);
      expect(Number(m[3])).toBeLessThanOrEqual(20);
      // keine negativen Ergebnisse bei Subtraktion
      expect(item.correctNumber).toBeGreaterThanOrEqual(0);
    }
  });

  it("Klasse 3: nur Mal/Geteilt, ganzzahlige Division", () => {
    const items = generateMathAssignmentItems({ count: 40, grade: 3, difficulty: "medium" });
    for (const item of items) {
      expect(item.question).toMatch(/[·:]/u);
      expect(Number.isInteger(item.correctNumber)).toBe(true);
      expect(item.correctNumber).toBeGreaterThan(0);
    }
  });

  it("Klasse 1 hard: erzwingt Zehneruebergang (Carry/Borrow)", () => {
    const items = generateMathAssignmentItems({ count: 30, grade: 1, difficulty: "hard" });
    for (const item of items) {
      const m = item.question.match(/^(\d+)\s+(.)\s+(\d+)/u)!;
      const a = Number(m[1]);
      const b = Number(m[3]);
      if (m[2] === "+") {
        expect((a % 10) + (b % 10)).toBeGreaterThanOrEqual(10);
      } else {
        expect(a % 10).toBeLessThan(b % 10);
      }
    }
  });
});

describe("generateMathAssignmentItems — Themen-Fokus", () => {
  it("Einmaleins der 7: jede Aufgabe enthaelt den Faktor 7", () => {
    const focus: ExerciseFocus = { kind: "times_table", factor: 7 };
    const items = generateMathAssignmentItems({ count: 15, focus });
    for (const item of items) {
      const m = item.question.match(/^(\d+)\s+·\s+(\d+)/u)!;
      expect(Number(m[1]) === 7 || Number(m[2]) === 7).toBe(true);
      expect(item.correctNumber).toBe(evalQuestion(item.question));
    }
  });

  it("Geteilt durch 4: ganzzahlige Ergebnisse, Divisor immer 4", () => {
    const focus: ExerciseFocus = { kind: "divide_by", factor: 4 };
    const items = generateMathAssignmentItems({ count: 12, focus });
    for (const item of items) {
      const m = item.question.match(/^(\d+)\s+:\s+(\d+)/u)!;
      expect(Number(m[2])).toBe(4);
      expect(item.correctNumber).toBe(evalQuestion(item.question));
      expect(Number.isInteger(item.correctNumber)).toBe(true);
    }
  });

  it("add_up_to 20: Summe bleibt <= 20", () => {
    const focus: ExerciseFocus = { kind: "add_up_to", max: 20 };
    const items = generateMathAssignmentItems({ count: 20, focus });
    for (const item of items) {
      expect(item.correctNumber).toBeLessThanOrEqual(20);
      expect(item.correctNumber).toBe(evalQuestion(item.question));
    }
  });

  it("Fokus hat Vorrang vor grade/difficulty", () => {
    const focus: ExerciseFocus = { kind: "times_table", factor: 5 };
    const items = generateMathAssignmentItems({ count: 8, focus, grade: 1, difficulty: "easy" });
    for (const item of items) {
      expect(item.question).toMatch(/·/u);
    }
  });
});

describe("generateMathAssignmentItems — Eindeutigkeit", () => {
  it("erzeugt bei genug grossem Aufgabenraum keine Duplikate", () => {
    const items = generateMathAssignmentItems({ count: 30, grade: 4, difficulty: "medium" });
    const keys = items.map((i) => i.question);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("liefert auch bei kleinem Aufgabenraum genau count Items (Duplikate erlaubt)", () => {
    // Einmaleins der 1 hat nur ~10 verschiedene Aufgaben — count 30 erzwingt Wiederholungen.
    const focus: ExerciseFocus = { kind: "times_table", factor: 1 };
    const items = generateMathAssignmentItems({ count: 30, focus });
    expect(items).toHaveLength(30);
    // correctNumber bleibt trotzdem ueberall korrekt.
    for (const item of items) {
      expect(item.correctNumber).toBe(evalQuestion(item.question));
    }
  });
});

describe("generateMathAssignmentItems — Validierung", () => {
  it("wirft bei ungueltiger Anzahl", () => {
    expect(() => generateMathAssignmentItems({ count: 0, grade: 1, difficulty: "easy" })).toThrow();
    expect(() => generateMathAssignmentItems({ count: 51, grade: 1, difficulty: "easy" })).toThrow();
    expect(() =>
      generateMathAssignmentItems({ count: 2.5, grade: 1, difficulty: "easy" })
    ).toThrow();
  });

  it("wirft, wenn ohne Fokus grade/difficulty fehlen", () => {
    expect(() => generateMathAssignmentItems({ count: 5 })).toThrow();
    expect(() => generateMathAssignmentItems({ count: 5, grade: 2 })).toThrow();
  });
});
