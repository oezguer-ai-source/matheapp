import { describe, it, expect } from "vitest";
import {
  computeLevel,
  progressInLevel,
  xpForNextLevel,
  xpForCurrentLevel,
  getDinoStage,
  MAX_LEVEL,
  XP_THRESHOLDS,
} from "@/lib/avatar/levels";

describe("computeLevel", () => {
  it("startet bei Level 1 mit 0 XP", () => {
    expect(computeLevel(0)).toBe(1);
  });

  it("bleibt Level 1 knapp unter der zweiten Schwelle", () => {
    expect(computeLevel(49)).toBe(1);
  });

  it("steigt genau auf der Schwelle auf das naechste Level", () => {
    expect(computeLevel(50)).toBe(2);
    expect(computeLevel(150)).toBe(3);
  });

  it("ordnet jede Schwelle dem korrekten Level zu", () => {
    XP_THRESHOLDS.forEach((threshold, idx) => {
      expect(computeLevel(threshold)).toBe(idx + 1);
    });
  });

  it("erreicht Max-Level genau auf der letzten Schwelle", () => {
    expect(computeLevel(9000)).toBe(MAX_LEVEL);
  });

  it("kappt auf Max-Level bei sehr hoher XP", () => {
    expect(computeLevel(999999)).toBe(MAX_LEVEL);
  });

  it("behandelt negative XP als Level 1", () => {
    expect(computeLevel(-100)).toBe(1);
  });
});

describe("progressInLevel", () => {
  it("zeigt 0% am Anfang eines Levels", () => {
    const p = progressInLevel(50, 2);
    expect(p.earned).toBe(0);
    expect(p.percent).toBe(0);
  });

  it("berechnet den Fortschritt mitten im Level", () => {
    // Level 2: 50..150, span = 100. Bei 100 XP -> 50 earned -> 50%
    const p = progressInLevel(100, 2);
    expect(p.earned).toBe(50);
    expect(p.needed).toBe(100);
    expect(p.percent).toBe(50);
  });

  it("kappt percent bei 100", () => {
    const p = progressInLevel(99999, 2);
    expect(p.percent).toBe(100);
  });

  it("liefert 100% und needed=0 im Max-Level", () => {
    const p = progressInLevel(9000, MAX_LEVEL);
    expect(p.percent).toBe(100);
    expect(p.needed).toBe(0);
    expect(p.earned).toBe(0);
  });
});

describe("xpForNextLevel / xpForCurrentLevel", () => {
  it("liefert die naechste Schwelle fuer Nicht-Max-Level", () => {
    expect(xpForNextLevel(1)).toBe(50);
    expect(xpForNextLevel(2)).toBe(150);
  });

  it("liefert null im Max-Level", () => {
    expect(xpForNextLevel(MAX_LEVEL)).toBeNull();
  });

  it("liefert die Start-XP des aktuellen Levels", () => {
    expect(xpForCurrentLevel(1)).toBe(0);
    expect(xpForCurrentLevel(3)).toBe(150);
  });
});

describe("getDinoStage", () => {
  it("liefert die passende Stufe fuer ein gueltiges Level", () => {
    expect(getDinoStage(1).title).toBe("Ei");
    expect(getDinoStage(MAX_LEVEL).title).toBe("Legendärer Dino");
  });

  it("klemmt zu kleine Level auf die erste Stufe", () => {
    expect(getDinoStage(0).level).toBe(1);
  });

  it("klemmt zu grosse Level auf die letzte Stufe", () => {
    expect(getDinoStage(99).level).toBe(MAX_LEVEL);
  });
});
