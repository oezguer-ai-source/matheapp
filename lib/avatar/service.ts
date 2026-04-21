// Pure server-side helpers — KEIN "use server" Top-Level.
// Diese Funktionen werden direkt aus Server Components/Actions importiert
// und laufen in-process, nicht als separate Server-Action-Requests.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { computeLevel } from "./levels";

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

export function defaultSnapshot(): AvatarSnapshot {
  return {
    level: 1,
    xp: 0,
    dinoName: "Rexi",
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDay: null,
  };
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export async function fetchAvatarSnapshot(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AvatarSnapshot> {
  const [avatarRes, streakRes] = await Promise.all([
    supabase
      .from("avatar_state")
      .select("level, xp, dino_name")
      .eq("child_id", userId)
      .maybeSingle(),
    supabase
      .from("streak_state")
      .select("current_streak, best_streak, last_active_day")
      .eq("child_id", userId)
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

export async function recordActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  pointsEarned: number
): Promise<ActivityResult | null> {
  const delta = Number.isFinite(pointsEarned)
    ? Math.max(0, Math.floor(pointsEarned))
    : 0;

  const { data: existingAvatar } = await supabase
    .from("avatar_state")
    .select("xp, level, dino_name")
    .eq("child_id", userId)
    .maybeSingle();

  const oldXp = existingAvatar?.xp ?? 0;
  const oldLevel = existingAvatar?.level ?? 1;
  const newXp = oldXp + delta;
  const newLevel = computeLevel(newXp);

  const avatarUpsert = await supabase
    .from("avatar_state")
    .upsert(
      {
        child_id: userId,
        xp: newXp,
        level: newLevel,
        dino_name: existingAvatar?.dino_name ?? "Rexi",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "child_id" }
    );

  if (avatarUpsert.error) return null;

  const today = todayUTC();
  const { data: existingStreak } = await supabase
    .from("streak_state")
    .select("current_streak, best_streak, last_active_day")
    .eq("child_id", userId)
    .maybeSingle();

  const oldStreak = existingStreak?.current_streak ?? 0;
  const oldBest = existingStreak?.best_streak ?? 0;
  const last = existingStreak?.last_active_day ?? null;

  let nextStreak: number;
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
        child_id: userId,
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
