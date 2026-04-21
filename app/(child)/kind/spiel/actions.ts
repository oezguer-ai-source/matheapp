"use server";

import { createClient } from "@/lib/supabase/server";
import { isGameKey, type GameKey } from "@/lib/config/games";

export async function saveGameScoreAction(
  gameKey: string,
  score: number
): Promise<{ success: boolean; error?: string }> {
  if (!isGameKey(gameKey)) {
    return { success: false, error: "Unbekanntes Spiel." };
  }
  if (!Number.isFinite(score) || score < 0 || score > 10000) {
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
