export const XP_THRESHOLDS = [
  0, 50, 150, 400, 800, 1500, 2500, 4000, 6000, 9000,
] as const;

export const MAX_LEVEL = XP_THRESHOLDS.length;

export interface DinoStage {
  level: number;
  title: string;
  callout: string;
}

export const DINO_STAGES: readonly DinoStage[] = [
  { level: 1, title: "Ei", callout: "Hallo! Bald schlüpfe ich!" },
  { level: 2, title: "Baby-Dino", callout: "Juhuu! Ich bin geschlüpft!" },
  { level: 3, title: "Kleiner Dino", callout: "Ich wachse mit dir!" },
  { level: 4, title: "Grüner Dino", callout: "Los, noch mehr rechnen!" },
  { level: 5, title: "Feuer-Dino", callout: "Ich bin jetzt Feuer-Dino!" },
  { level: 6, title: "Eis-Dino", callout: "Cool, oder?" },
  { level: 7, title: "Flügel-Dino", callout: "Jetzt kann ich fliegen!" },
  { level: 8, title: "Goldener Dino", callout: "Glanz und Gloria!" },
  { level: 9, title: "Königs-Dino", callout: "Krone auf — du bist top!" },
  { level: 10, title: "Legendärer Dino", callout: "Mega! Du bist legendär!" },
] as const;

export function computeLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, MAX_LEVEL);
}

export function xpForNextLevel(level: number): number | null {
  if (level >= MAX_LEVEL) return null;
  return XP_THRESHOLDS[level];
}

export function xpForCurrentLevel(level: number): number {
  return XP_THRESHOLDS[Math.max(0, level - 1)];
}

export function progressInLevel(xp: number, level: number): {
  earned: number;
  needed: number;
  percent: number;
} {
  const start = xpForCurrentLevel(level);
  const next = xpForNextLevel(level);
  if (next === null) {
    return { earned: 0, needed: 0, percent: 100 };
  }
  const span = next - start;
  const earned = Math.max(0, xp - start);
  const percent = Math.min(100, Math.round((earned / span) * 100));
  return { earned, needed: span, percent };
}

export function getDinoStage(level: number): DinoStage {
  const idx = Math.max(0, Math.min(MAX_LEVEL - 1, level - 1));
  return DINO_STAGES[idx];
}
