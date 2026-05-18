import { describe, it, expect } from "vitest";
import { GAMES, getGame, isGameKey } from "@/lib/config/games";

/**
 * E1 — Score-Obergrenze: spiegelt die Pruefung aus
 * app/(child)/kind/spiel/actions.ts (saveGameScoreAction) gegen die reine
 * Config-Logik, ohne die DB-abhaengige Server-Action selbst aufzurufen.
 */
function isScoreAccepted(gameKey: string, score: number): boolean {
  if (!isGameKey(gameKey)) return false;
  const game = getGame(gameKey);
  return Number.isFinite(score) && score >= 0 && score <= game.maxScore;
}

describe("games config — maxScore", () => {
  it("jedes Spiel hat eine positive maxScore-Obergrenze", () => {
    for (const game of GAMES) {
      expect(game.maxScore).toBeGreaterThan(0);
      expect(Number.isFinite(game.maxScore)).toBe(true);
    }
  });

  it("isGameKey erkennt bekannte und unbekannte Keys", () => {
    expect(isGameKey("balloon")).toBe(true);
    expect(isGameKey("quickmath")).toBe(true);
    expect(isGameKey("hack")).toBe(false);
  });

  it("getGame wirft fuer ein unbekanntes Spiel", () => {
    // @ts-expect-error — bewusst ungueltiger Key
    expect(() => getGame("hack")).toThrow();
  });
});

describe("E1 — Score-Obergrenze pro Spiel", () => {
  it("akzeptiert einen plausiblen Score innerhalb des Limits", () => {
    expect(isScoreAccepted("balloon", 80)).toBe(true);
    expect(isScoreAccepted("quickmath", 40)).toBe(true);
  });

  it("akzeptiert genau den maxScore als Grenzwert", () => {
    expect(isScoreAccepted("balloon", getGame("balloon").maxScore)).toBe(true);
  });

  it("lehnt einen Score ueber dem maxScore ab (Manipulation)", () => {
    expect(isScoreAccepted("balloon", getGame("balloon").maxScore + 1)).toBe(
      false
    );
    expect(isScoreAccepted("balloon", 10000)).toBe(false);
  });

  it("lehnt negative und nicht-endliche Scores ab", () => {
    expect(isScoreAccepted("balloon", -1)).toBe(false);
    expect(isScoreAccepted("balloon", Number.POSITIVE_INFINITY)).toBe(false);
    expect(isScoreAccepted("balloon", NaN)).toBe(false);
  });

  it("lehnt einen Score fuer ein unbekanntes Spiel ab", () => {
    expect(isScoreAccepted("hack", 5)).toBe(false);
  });
});
