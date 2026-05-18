import { describe, it, expect } from 'vitest';
import {
  generateExercise,
  compute,
  randomInt,
  hasCarry,
  hasBorrow,
} from '@/lib/exercises/generators';
import { RANGES } from '@/lib/exercises/config';

// UUID v4 format regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ITER = 200;

describe('grade 1 — Plus/Minus bis 20', () => {
  it('easy: +/- mit Operanden 1-10', () => {
    for (let i = 0; i < ITER; i++) {
      const ex = generateExercise(1, 'easy');
      expect(ex.operand1).toBeGreaterThanOrEqual(1);
      expect(ex.operand1).toBeLessThanOrEqual(10);
      expect(ex.operand2).toBeGreaterThanOrEqual(1);
      expect(ex.operand2).toBeLessThanOrEqual(10);
      expect(['+', '-']).toContain(ex.operator);
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('medium: +/- mit Operanden 1-20', () => {
    for (let i = 0; i < ITER; i++) {
      const ex = generateExercise(1, 'medium');
      expect(ex.operand1).toBeGreaterThanOrEqual(1);
      expect(ex.operand1).toBeLessThanOrEqual(20);
      expect(ex.operand2).toBeGreaterThanOrEqual(1);
      expect(ex.operand2).toBeLessThanOrEqual(20);
      expect(['+', '-']).toContain(ex.operator);
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('hard: +/- bis 20 mit PFLICHT-Zehneruebergang (echte Steigerung ggue. medium)', () => {
    for (let i = 0; i < ITER; i++) {
      const ex = generateExercise(1, 'hard');
      expect(ex.operand1).toBeGreaterThanOrEqual(2);
      expect(ex.operand1).toBeLessThanOrEqual(20);
      expect(ex.operand2).toBeGreaterThanOrEqual(2);
      expect(ex.operand2).toBeLessThanOrEqual(20);
      expect(['+', '-']).toContain(ex.operator);
      // Kern des C1-Fix: jede hard-Aufgabe hat einen Zehneruebergang
      if (ex.operator === '+') {
        expect(hasCarry(ex.operand1, ex.operand2)).toBe(true);
      } else {
        expect(hasBorrow(ex.operand1, ex.operand2)).toBe(true);
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });
});

describe('grade 2 — Plus/Minus bis 100', () => {
  it('easy: +/- mit Operanden 1-50', () => {
    for (let i = 0; i < ITER; i++) {
      const ex = generateExercise(2, 'easy');
      expect(ex.operand1).toBeGreaterThanOrEqual(1);
      expect(ex.operand1).toBeLessThanOrEqual(50);
      expect(ex.operand2).toBeGreaterThanOrEqual(1);
      expect(ex.operand2).toBeLessThanOrEqual(50);
      expect(['+', '-']).toContain(ex.operator);
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('medium: +/- mit Operanden 1-100', () => {
    for (let i = 0; i < ITER; i++) {
      const ex = generateExercise(2, 'medium');
      expect(ex.operand1).toBeGreaterThanOrEqual(1);
      expect(ex.operand1).toBeLessThanOrEqual(100);
      expect(ex.operand2).toBeGreaterThanOrEqual(1);
      expect(ex.operand2).toBeLessThanOrEqual(100);
      expect(['+', '-']).toContain(ex.operator);
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('hard: +/- bis 100 mit PFLICHT-Zehneruebergang', () => {
    for (let i = 0; i < ITER; i++) {
      const ex = generateExercise(2, 'hard');
      expect(ex.operand1).toBeGreaterThanOrEqual(10);
      expect(ex.operand1).toBeLessThanOrEqual(100);
      expect(ex.operand2).toBeGreaterThanOrEqual(10);
      expect(ex.operand2).toBeLessThanOrEqual(100);
      expect(['+', '-']).toContain(ex.operator);
      if (ex.operator === '+') {
        expect(hasCarry(ex.operand1, ex.operand2)).toBe(true);
      } else {
        expect(hasBorrow(ex.operand1, ex.operand2)).toBe(true);
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });
});

describe('grade 3 — kleines Einmaleins', () => {
  it('easy: * oder / mit kleinen Reihen (2-5)', () => {
    for (let i = 0; i < ITER; i++) {
      const ex = generateExercise(3, 'easy');
      expect(['*', '/']).toContain(ex.operator);
      if (ex.operator === '*') {
        expect(ex.operand1).toBeGreaterThanOrEqual(2);
        expect(ex.operand1).toBeLessThanOrEqual(5);
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
        expect(ex.operand2).toBeLessThanOrEqual(5);
      } else {
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
        expect(ex.operand2).toBeLessThanOrEqual(5);
        expect(Number.isInteger(ex.correctAnswer)).toBe(true);
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('medium: volles Einmaleins bis 10x10', () => {
    for (let i = 0; i < ITER; i++) {
      const ex = generateExercise(3, 'medium');
      expect(['*', '/']).toContain(ex.operator);
      if (ex.operator === '*') {
        expect(ex.operand1).toBeGreaterThanOrEqual(2);
        expect(ex.operand1).toBeLessThanOrEqual(10);
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
        expect(ex.operand2).toBeLessThanOrEqual(10);
        expect(ex.correctAnswer).toBeLessThanOrEqual(100);
      } else {
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
        expect(ex.operand2).toBeLessThanOrEqual(10);
        expect(Number.isInteger(ex.correctAnswer)).toBe(true);
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('hard: grosses Einmaleins (Faktoren 6-12), Ergebnis bleibt <= 144', () => {
    for (let i = 0; i < ITER; i++) {
      const ex = generateExercise(3, 'hard');
      expect(['*', '/']).toContain(ex.operator);
      if (ex.operator === '*') {
        expect(ex.operand1).toBeGreaterThanOrEqual(6);
        expect(ex.operand1).toBeLessThanOrEqual(12);
        expect(ex.operand2).toBeGreaterThanOrEqual(6);
        expect(ex.operand2).toBeLessThanOrEqual(12);
        // echte Steigerung ggue. medium, aber lehrplangerecht beschraenkt
        expect(ex.correctAnswer).toBeLessThanOrEqual(144);
      } else {
        expect(ex.operand2).toBeGreaterThanOrEqual(6);
        expect(ex.operand2).toBeLessThanOrEqual(12);
        expect(Number.isInteger(ex.correctAnswer)).toBe(true);
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });
});

describe('grade 4 — gemischt, groesserer Zahlenraum', () => {
  it('easy: +,-,*,/ — Add/Sub bis 100, Mal/Geteilt einstellig', () => {
    for (let i = 0; i < ITER; i++) {
      const ex = generateExercise(4, 'easy');
      expect(['+', '-', '*', '/']).toContain(ex.operator);
      if (ex.operator === '+' || ex.operator === '-') {
        expect(ex.operand1).toBeGreaterThanOrEqual(10);
        expect(ex.operand1).toBeLessThanOrEqual(100);
        expect(ex.operand2).toBeGreaterThanOrEqual(10);
        expect(ex.operand2).toBeLessThanOrEqual(100);
      } else {
        expect(ex.correctAnswer).toBeLessThanOrEqual(81);
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('medium: Add/Sub bis 1000, Multiplikation zweistellig x einstellig', () => {
    for (let i = 0; i < ITER; i++) {
      const ex = generateExercise(4, 'medium');
      expect(['+', '-', '*', '/']).toContain(ex.operator);
      if (ex.operator === '+' || ex.operator === '-') {
        expect(ex.operand1).toBeGreaterThanOrEqual(10);
        expect(ex.operand1).toBeLessThanOrEqual(1000);
        expect(ex.operand2).toBeGreaterThanOrEqual(10);
        expect(ex.operand2).toBeLessThanOrEqual(1000);
      } else if (ex.operator === '*') {
        // C2-Fix: keine absurden Produkte mehr, Produkt <= 99*9 = 891
        expect(ex.correctAnswer).toBeLessThanOrEqual(891);
      } else {
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });

  it('hard: Add/Sub bis 1000 mit Zehneruebergang, Produkte bleiben <= 891 (C2-Fix)', () => {
    for (let i = 0; i < ITER; i++) {
      const ex = generateExercise(4, 'hard');
      expect(['+', '-', '*', '/']).toContain(ex.operator);
      if (ex.operator === '+') {
        expect(ex.operand1).toBeGreaterThanOrEqual(100);
        expect(ex.operand1).toBeLessThanOrEqual(1000);
        expect(hasCarry(ex.operand1, ex.operand2)).toBe(true);
      } else if (ex.operator === '-') {
        expect(ex.operand1).toBeGreaterThanOrEqual(100);
        expect(ex.operand1).toBeLessThanOrEqual(1000);
        expect(hasBorrow(ex.operand1, ex.operand2)).toBe(true);
      } else if (ex.operator === '*') {
        // C2-Fix: keine 1.000.000-Produkte mehr
        expect(ex.correctAnswer).toBeLessThanOrEqual(891);
      } else {
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
      }
      expect(ex.correctAnswer).toBe(compute(ex.operand1, ex.operand2, ex.operator));
    }
  });
});

describe('C1 — hard ist echt schwerer als medium', () => {
  it('Kl.1-3: hard hat ein hoeheres max-Potenzial oder erzwingt Zehneruebergang', () => {
    for (const grade of [1, 2] as const) {
      const cfg = RANGES[grade];
      // gleicher Zahlenraum, aber hard verlangt Zehneruebergang
      expect(cfg.hard.requireCarry).toBe(true);
      expect(cfg.medium.requireCarry).toBe(false);
    }
    // Kl.3: hard hat groessere Faktoren als medium
    expect(RANGES[3].hard.mulDiv.factor1.max).toBeGreaterThan(
      RANGES[3].medium.mulDiv.factor1.max
    );
  });

  it('Kl.4: hard erzwingt Zehneruebergang und groesseren Add/Sub-Bereich-Beginn', () => {
    expect(RANGES[4].hard.requireCarry).toBe(true);
    expect(RANGES[4].hard.addSub.min).toBeGreaterThan(RANGES[4].medium.addSub.min);
  });
});

describe('C2 — Klasse 4 erzeugt keine absurden Produkte', () => {
  it('Multiplikations-Produkt bleibt in allen Stufen <= 891 (Grundschullehrplan)', () => {
    for (const diff of ['easy', 'medium', 'hard'] as const) {
      const { factor1, factor2 } = RANGES[4][diff].mulDiv;
      expect(factor1.max * factor2.max).toBeLessThanOrEqual(891);
    }
  });
});

describe('constraints', () => {
  it('no negatives: Subtraktions-Ergebnis ist immer >= 0', () => {
    for (let i = 0; i < 400; i++) {
      const grade = ([1, 2, 3, 4] as const)[Math.floor(Math.random() * 4)];
      const diff = (['easy', 'medium', 'hard'] as const)[Math.floor(Math.random() * 3)];
      const ex = generateExercise(grade, diff);
      if (ex.operator === '-') {
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('no remainders: Divisions-Ergebnis ist immer eine Ganzzahl', () => {
    for (let i = 0; i < 400; i++) {
      const grade = ([3, 4] as const)[Math.floor(Math.random() * 2)];
      const diff = (['easy', 'medium', 'hard'] as const)[Math.floor(Math.random() * 3)];
      const ex = generateExercise(grade, diff);
      if (ex.operator === '/') {
        expect(Number.isInteger(ex.correctAnswer)).toBe(true);
      }
    }
  });

  it('no division by zero: Divisor ist immer >= 2', () => {
    for (let i = 0; i < 400; i++) {
      const grade = ([3, 4] as const)[Math.floor(Math.random() * 2)];
      const diff = (['easy', 'medium', 'hard'] as const)[Math.floor(Math.random() * 3)];
      const ex = generateExercise(grade, diff);
      if (ex.operator === '/') {
        expect(ex.operand2).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('Aufgabe hat eine UUID', () => {
    const ex = generateExercise(1, 'easy');
    expect(ex.id).toMatch(UUID_REGEX);
  });

  it('ungueltige Klassenstufe wirft Fehler', () => {
    expect(() => generateExercise(0, 'easy')).toThrow();
    expect(() => generateExercise(5, 'easy')).toThrow();
    expect(() => generateExercise(2.5, 'easy')).toThrow();
  });
});

describe('hasCarry / hasBorrow', () => {
  it('hasCarry erkennt Zehneruebergang bei Addition', () => {
    expect(hasCarry(8, 7)).toBe(true); // 8+7=15
    expect(hasCarry(12, 3)).toBe(false); // 2+3=5
    expect(hasCarry(26, 14)).toBe(true); // 6+4=10
  });

  it('hasBorrow erkennt Zehneruebergang bei Subtraktion', () => {
    expect(hasBorrow(13, 6)).toBe(true); // 3 < 6
    expect(hasBorrow(15, 2)).toBe(false); // 5 >= 2
    expect(hasBorrow(42, 18)).toBe(true); // 2 < 8
  });
});

describe('compute helper', () => {
  it('berechnet 3 + 5 = 8', () => {
    expect(compute(3, 5, '+')).toBe(8);
  });

  it('berechnet 10 - 3 = 7', () => {
    expect(compute(10, 3, '-')).toBe(7);
  });

  it('berechnet 4 * 6 = 24', () => {
    expect(compute(4, 6, '*')).toBe(24);
  });

  it('berechnet 20 / 5 = 4', () => {
    expect(compute(20, 5, '/')).toBe(4);
  });
});

describe('randomInt', () => {
  it('liefert Werte im inklusiven Bereich', () => {
    const values = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const val = randomInt(3, 7);
      expect(val).toBeGreaterThanOrEqual(3);
      expect(val).toBeLessThanOrEqual(7);
      values.add(val);
    }
    expect(values.size).toBe(5);
  });
});
