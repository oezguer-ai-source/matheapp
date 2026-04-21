export type GameKey = "balloon" | "quickmath";

export interface GameConfig {
  key: GameKey;
  name: string;
  emoji: string;
  description: string;
  unlockAt: number;
  route: string;
  scoreUnit: string;
  color: string;
}

export const GAMES: readonly GameConfig[] = [
  {
    key: "balloon",
    name: "Ballonplatzen",
    emoji: "🎈",
    description: "Platze so viele Ballons wie du kannst!",
    unlockAt: 100,
    route: "/kind/spiel/ballon",
    scoreUnit: "Ballons",
    color: "from-sky-400 to-blue-500",
  },
  {
    key: "quickmath",
    name: "Schnellrechnen",
    emoji: "⚡",
    description: "Löse so viele Aufgaben wie möglich in 60 Sekunden!",
    unlockAt: 300,
    route: "/kind/spiel/schnellrechnen",
    scoreUnit: "Aufgaben",
    color: "from-orange-400 to-pink-500",
  },
] as const;

export function isGameKey(value: string): value is GameKey {
  return GAMES.some((g) => g.key === value);
}

export function getGame(key: GameKey): GameConfig {
  const g = GAMES.find((x) => x.key === key);
  if (!g) throw new Error(`Unknown game: ${key}`);
  return g;
}
