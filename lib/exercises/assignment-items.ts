// lib/exercises/assignment-items.ts
//
// Generator-Adapter fuer die Aufgaben-Erstellung (Lehrer-Bereich, Paket B).
//
// Nutzt die vorhandene Mathe-Engine (generators.ts, focus.ts, config.ts) und
// mappt die erzeugten Aufgaben in das assignment-item-Format, das das
// Zod-Schema `assignmentItemSchema` mit `itemType: 'math'` erwartet.
//
// Reine, deterministisch testbare Funktion (abgesehen von Math.random in der
// Engine). `correctNumber` ist immer das korrekte Rechenergebnis.

import { generateExercise } from "./generators";
import { generateFocusedExercise, type ExerciseFocus } from "./focus";
import type { Difficulty, Exercise, Operator, Grade } from "./types";

/**
 * Ein generiertes Mathe-Item im Format des assignment-item-Schemas.
 * Entspricht `assignmentItemSchema` mit `itemType: 'math'`:
 * options/correctOptions bleiben bewusst weg (leer).
 */
export interface MathAssignmentItem {
  itemType: "math";
  question: string;
  correctNumber: number;
  sortOrder: number;
}

/**
 * Konfiguration fuer die Generierung von Mathe-Items.
 *
 * Entweder klassen-/schwierigkeitsbasiert (`grade` + `difficulty`) ueber die
 * RANGES-Konfiguration, ODER themenfokussiert (`focus`) ueber die Foci aus
 * focus.ts. Ist `focus` gesetzt, hat es Vorrang.
 */
export interface GenerateMathItemsOptions {
  /** Anzahl der zu erzeugenden Aufgaben (1..50, analog assignment-Limit). */
  count: number;
  /** Klassenstufe 1-4 (Pflicht, wenn kein `focus` gesetzt ist). */
  grade?: Grade;
  /** Schwierigkeit (Pflicht, wenn kein `focus` gesetzt ist). */
  difficulty?: Difficulty;
  /** Themen-Fokus (z.B. Einmaleins der 7). Hat Vorrang vor grade/difficulty. */
  focus?: ExerciseFocus;
}

/** Hoechstzahl an Items, analog zum max() in createAssignmentSchema. */
const MAX_ITEMS = 50;
/** Maximale Versuche, eine eindeutige (noch nicht vorhandene) Aufgabe zu finden. */
const MAX_UNIQUE_ATTEMPTS = 200;

const OPERATOR_SYMBOL: Record<Operator, string> = {
  "+": "+",
  "-": "−",
  "*": "·",
  "/": ":",
};

/**
 * Formatiert eine Exercise als kindgerechte Aufgabenzeile, z.B. "7 + 8 = ?".
 */
export function formatExerciseQuestion(ex: Exercise): string {
  return `${ex.operand1} ${OPERATOR_SYMBOL[ex.operator]} ${ex.operand2} = ?`;
}

/**
 * Erzeugt `count` Mathe-Aufgaben und mappt sie ins assignment-item-Format.
 *
 * Die Funktion bemueht sich um Eindeutigkeit der Aufgabenstellungen (gleiche
 * operand1/operator/operand2 nicht doppelt). Ist der Aufgabenraum kleiner als
 * `count` (z.B. nur wenige moegliche Einmaleins-Aufgaben), werden nach
 * Ausschoepfen der Versuche auch Duplikate zugelassen, damit immer genau
 * `count` Items zurueckkommen.
 *
 * @throws wenn `count` ausserhalb 1..50 liegt oder die Konfiguration unvollstaendig ist.
 */
export function generateMathAssignmentItems(
  options: GenerateMathItemsOptions
): MathAssignmentItem[] {
  const { count, grade, difficulty, focus } = options;

  if (!Number.isInteger(count) || count < 1 || count > MAX_ITEMS) {
    throw new Error(
      `Ungueltige Anzahl: ${count}. Erlaubt sind 1 bis ${MAX_ITEMS} Aufgaben.`
    );
  }
  if (!focus && (grade == null || difficulty == null)) {
    throw new Error(
      "Ohne Themen-Fokus muessen Klassenstufe und Schwierigkeit angegeben werden."
    );
  }

  const makeExercise = (): Exercise =>
    focus
      ? generateFocusedExercise(focus)
      : generateExercise(grade as number, difficulty as Difficulty);

  const items: MathAssignmentItem[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < count; i++) {
    let ex = makeExercise();
    // Eindeutigkeit anstreben — Schluessel ist die reine Aufgabenstellung.
    let attempts = 0;
    let key = `${ex.operand1}${ex.operator}${ex.operand2}`;
    while (seen.has(key) && attempts < MAX_UNIQUE_ATTEMPTS) {
      ex = makeExercise();
      key = `${ex.operand1}${ex.operator}${ex.operand2}`;
      attempts++;
    }
    seen.add(key);

    items.push({
      itemType: "math",
      question: formatExerciseQuestion(ex),
      correctNumber: ex.correctAnswer,
      sortOrder: i,
    });
  }

  return items;
}
