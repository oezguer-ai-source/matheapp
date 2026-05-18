"use server";

import { createClient } from "@/lib/supabase/server";
import { isGameKey, getGame, type GameKey } from "@/lib/config/games";

export async function saveGameScoreAction(
  gameKey: string,
  score: number
): Promise<{ success: boolean; error?: string }> {
  if (!isGameKey(gameKey)) {
    return { success: false, error: "Unbekanntes Spiel." };
  }

  const game = getGame(gameKey);

  // E1 — Realistische Score-Obergrenze pro Spiel statt pauschalem 10000-Limit.
  if (!Number.isFinite(score) || score < 0 || score > game.maxScore) {
    return { success: false, error: "Ungültiger Punktestand." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Nicht angemeldet." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("class_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // E1 — Freischaltung serverseitig prüfen: das Spiel zählt nur, wenn das Kind
  // genug Gesamtpunkte (progress_entries) für den unlockAt-Schwellwert hat.
  // So lässt sich ein gesperrtes Spiel nicht per direktem Action-Aufruf umgehen.
  const { data: entries } = await supabase
    .from("progress_entries")
    .select("points_earned")
    .eq("child_id", user.id);

  const totalPoints = (entries ?? []).reduce(
    (sum, e) => sum + (e.points_earned ?? 0),
    0
  );

  if (totalPoints < game.unlockAt) {
    return { success: false, error: "Dieses Spiel ist noch nicht freigeschaltet." };
  }

  const { error: insertError } = await supabase.from("game_scores").insert({
    child_id: user.id,
    class_id: profile?.class_id ?? null,
    game_key: gameKey satisfies GameKey,
    score: Math.floor(score),
  });

  if (insertError) {
    return { success: false, error: "Fehler beim Speichern." };
  }

  return { success: true };
}
