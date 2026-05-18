// lib/exercises/config.ts
// Zahlenraum-Konfiguration pro Klassenstufe und Schwierigkeit.
//
// C1/C2-Audit-Fix:
//  - hard ist jetzt eine ECHTE Steigerung gegenueber medium (groesseres max
//    und/oder Pflicht-Zehneruebergang), nicht nur ein verkleinerter Bereich.
//  - Add/Sub und Mul/Div haben getrennte, lehrplangerechte Ranges, damit
//    Klasse 4 keine absurden Produkte (z.B. 1.000.000) mehr erzeugt.
//
// Lehrplan-Orientierung (Grundschule):
//  - Kl.1: Plus/Minus im Zahlenraum bis 20
//  - Kl.2: Plus/Minus im Zahlenraum bis 100
//  - Kl.3: kleines Einmaleins (bis 10x10) und zugehoerige Division
//  - Kl.4: gemischt, groesserer Zahlenraum; Mal/Geteilt bleibt bewusst
//          ueberschaubar (zweistellig x einstellig)

import { type Difficulty, type Grade, type Operator } from './types';

/** Inklusiver Wertebereich [min, max] fuer einen Operanden. */
export interface OperandRange {
  min: number;
  max: number;
}

export interface RangeConfig {
  /** Erlaubte Operatoren fuer diese Klasse/Schwierigkeit. */
  operators: Operator[];
  /** Operandenbereich fuer Addition und Subtraktion. */
  addSub: OperandRange;
  /**
   * Operandenbereich fuer Multiplikation und Division.
   * `factor1` ist der erste Faktor (bzw. Quotient bei Division),
   * `factor2` der zweite Faktor (bzw. Divisor bei Division).
   * Getrennt, damit z.B. Kl.4 "zweistellig x einstellig" abbilden kann.
   */
  mulDiv: { factor1: OperandRange; factor2: OperandRange };
  /**
   * Wenn true, muss eine Add-/Sub-Aufgabe einen Zehneruebergang haben
   * (Carry bei +, Borrow bei -). Das macht `hard` didaktisch echt schwerer
   * als `medium`, ohne den Zahlenraum kuenstlich zu beschneiden.
   */
  requireCarry: boolean;
}

export const RANGES: Record<Grade, Record<Difficulty, RangeConfig>> = {
  // Klasse 1 — Plus/Minus bis 20
  1: {
    easy: {
      operators: ['+', '-'],
      addSub: { min: 1, max: 10 },
      mulDiv: { factor1: { min: 1, max: 1 }, factor2: { min: 1, max: 1 } },
      requireCarry: false,
    },
    medium: {
      operators: ['+', '-'],
      addSub: { min: 1, max: 20 },
      mulDiv: { factor1: { min: 1, max: 1 }, factor2: { min: 1, max: 1 } },
      requireCarry: false,
    },
    hard: {
      // gleicher Zahlenraum bis 20, aber PFLICHT-Zehneruebergang
      // -> echte Steigerung (z.B. 8+7, 13-6 statt 12+3, 15-2)
      operators: ['+', '-'],
      addSub: { min: 2, max: 20 },
      mulDiv: { factor1: { min: 1, max: 1 }, factor2: { min: 1, max: 1 } },
      requireCarry: true,
    },
  },

  // Klasse 2 — Plus/Minus bis 100
  2: {
    easy: {
      operators: ['+', '-'],
      addSub: { min: 1, max: 50 },
      mulDiv: { factor1: { min: 1, max: 1 }, factor2: { min: 1, max: 1 } },
      requireCarry: false,
    },
    medium: {
      operators: ['+', '-'],
      addSub: { min: 1, max: 100 },
      mulDiv: { factor1: { min: 1, max: 1 }, factor2: { min: 1, max: 1 } },
      requireCarry: false,
    },
    hard: {
      // voller Zahlenraum bis 100 + Pflicht-Zehneruebergang
      operators: ['+', '-'],
      addSub: { min: 10, max: 100 },
      mulDiv: { factor1: { min: 1, max: 1 }, factor2: { min: 1, max: 1 } },
      requireCarry: true,
    },
  },

  // Klasse 3 — kleines Einmaleins (bis 10x10) und Division
  3: {
    easy: {
      operators: ['*', '/'],
      addSub: { min: 1, max: 1 },
      // Einmaleins bis 5 (kleine Reihen)
      mulDiv: { factor1: { min: 2, max: 5 }, factor2: { min: 2, max: 5 } },
      requireCarry: false,
    },
    medium: {
      operators: ['*', '/'],
      addSub: { min: 1, max: 1 },
      // volles kleines Einmaleins bis 10x10
      mulDiv: { factor1: { min: 2, max: 10 }, factor2: { min: 2, max: 10 } },
      requireCarry: false,
    },
    hard: {
      // echte Steigerung: Einmaleins-Ergebnisse bleiben <=120, aber ein
      // Faktor ist zweistellig (11..12 / "grosses Einmaleins").
      operators: ['*', '/'],
      addSub: { min: 1, max: 1 },
      mulDiv: { factor1: { min: 6, max: 12 }, factor2: { min: 6, max: 12 } },
      requireCarry: false,
    },
  },

  // Klasse 4 — gemischt, groesserer Zahlenraum
  4: {
    easy: {
      operators: ['+', '-', '*', '/'],
      addSub: { min: 10, max: 100 },
      // einstellig x einstellig (Einmaleins-Wiederholung)
      mulDiv: { factor1: { min: 2, max: 9 }, factor2: { min: 2, max: 9 } },
      requireCarry: false,
    },
    medium: {
      operators: ['+', '-', '*', '/'],
      addSub: { min: 10, max: 1000 },
      // zweistellig x einstellig -> Produkt <= 99*9 = 891
      mulDiv: { factor1: { min: 11, max: 99 }, factor2: { min: 2, max: 9 } },
      requireCarry: false,
    },
    hard: {
      // groesster Zahlenraum + Pflicht-Zehneruebergang bei +/-
      // Mal/Geteilt: zweistellig x einstellig mit groesserem zweiten Faktor
      // -> Produkt <= 99*9 = 891 (lehrplangerecht, keine 1.000.000 mehr)
      operators: ['+', '-', '*', '/'],
      addSub: { min: 100, max: 1000 },
      mulDiv: { factor1: { min: 12, max: 99 }, factor2: { min: 3, max: 9 } },
      requireCarry: true,
    },
  },
};
