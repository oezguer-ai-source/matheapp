"use server";

import { createClient } from "@/lib/supabase/server";
import { MINIGAME_THRESHOLD } from "@/lib/config/rewards";
import { revalidatePath } from "next/cache";

export async function startGameAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Nicht angemeldet." };
  }

  // Compute total points (same reduce pattern as dashboard)
  const { data: entries } = await supabase
    .from("progress_entries")
    .select("points_earned")
    .eq("child_id", user.id);

  const totalPoints = (entries ?? []).reduce(
    (sum, e) => sum + (e.points_earned ?? 0),
    0
  );

  // Race condition guard: re-check points server-side before deduction (T-40-01)
  if (totalPoints < MINIGAME_THRESHOLD) {
    return { success: false, error: "Nicht genug Punkte." };
  }

  // Load profile for grade_level (required field in progress_entries)
  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_level")
    .eq("user_id", user.id)
    .single();

  // INSERT negative progress_entry for minigame redemption (D-12, D-13)
  const { error: insertError } = await supabase
    .from("progress_entries")
    .insert({
      child_id: user.id,
      operation_type: "minigame_redeem",
      grade: profile?.grade_level ?? 1,
      correct: true,
      points_earned: -MINIGAME_THRESHOLD,
    });

  if (insertError) {
    return { success: false, error: "Fehler beim Speichern." };
  }

  // Invalidate dashboard cache so points reflect the deduction (Pitfall 5)
  revalidatePath("/kind/dashboard");

  return { success: true };
}
