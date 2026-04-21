"use server";

import { createClient } from "@/lib/supabase/server";
import { computeLevel } from "@/lib/avatar/levels";

export interface AvatarSnapshot {
  level: number;
  xp: number;
  dinoName: string;
  currentStreak: number;
  bestStreak: number;
  lastActiveDay: string | null;
}

export interface ActivityResult {
  levelUp: boolean;
  newLevel: number;
  oldLevel: number;
  streakIncreased: boolean;
  currentStreak: number;
  xp: number;
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export async function fetchAvatarStateAction(): Promise<AvatarSnapshot> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return defaultSnapshot();
  }

  const [avatarRes, streakRes] = await Promise.all([
    supabase
      .from("avatar_state")
      .select("level, xp, dino_name")
      .eq("child_id", user.id)
      .maybeSingle(),
    supabase
      .from("streak_state")
      .select("current_streak, best_streak, last_active_day")
      .eq("child_id", user.id)
      .maybeSingle(),
  ]);

  return {
    level: avatarRes.data?.level ?? 1,
    xp: avatarRes.data?.xp ?? 0,
    dinoName: avatarRes.data?.dino_name ?? "Rexi",
    currentStreak: streakRes.data?.current_streak ?? 0,
    bestStreak: streakRes.data?.best_streak ?? 0,
    lastActiveDay: streakRes.data?.last_active_day ?? null,
  };
}

function defaultSnapshot(): AvatarSnapshot {
  return {
    level: 1,
    xp: 0,
    dinoName: "Rexi",
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDay: null,
  };
}

/** Aktualisiert XP + Streak nach einer gelösten Aufgabe / einem Spiel. */
export async function recordActivityAction(
  pointsEarned: number
): Promise<ActivityResult | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const delta = Number.isFinite(pointsEarned) ? Math.max(0, Math.floor(pointsEarned)) : 0;

  // Avatar: XP erhöhen, Level neu berechnen
  const { data: existingAvatar } = await supabase
    .from("avatar_state")
    .select("xp, level, dino_name")
    .eq("child_id", user.id)
    .maybeSingle();

  const oldXp = existingAvatar?.xp ?? 0;
  const oldLevel = existingAvatar?.level ?? 1;
  const newXp = oldXp + delta;
  const newLevel = computeLevel(newXp);

  await supabase
    .from("avatar_state")
    .upsert(
      {
        child_id: user.id,
        xp: newXp,
        level: newLevel,
        dino_name: existingAvatar?.dino_name ?? "Rexi",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "child_id" }
    );

  // Streak: nur wenn Kind tatsächlich aktiv war (delta > 0 oder direktes Lösen)
  const today = todayUTC();
  const { data: existingStreak } = await supabase
    .from("streak_state")
    .select("current_streak, best_streak, last_active_day")
    .eq("child_id", user.id)
    .maybeSingle();

  const oldStreak = existingStreak?.current_streak ?? 0;
  const oldBest = existingStreak?.best_streak ?? 0;
  const last = existingStreak?.last_active_day ?? null;

  let nextStreak = oldStreak;
  let streakIncreased = false;

  if (last === today) {
    nextStreak = oldStreak;
  } else if (last && last === addDays(today, -1)) {
    nextStreak = oldStreak + 1;
    streakIncreased = true;
  } else {
    nextStreak = 1;
    streakIncreased = oldStreak === 0;
  }

  const nextBest = Math.max(oldBest, nextStreak);

  await supabase
    .from("streak_state")
    .upsert(
      {
        child_id: user.id,
        current_streak: nextStreak,
        best_streak: nextBest,
        last_active_day: today,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "child_id" }
    );

  return {
    levelUp: newLevel > oldLevel,
    newLevel,
    oldLevel,
    streakIncreased,
    currentStreak: nextStreak,
    xp: newXp,
  };
}
