import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MINIGAME_THRESHOLD } from "@/lib/config/rewards";
import BalloonGame from "@/components/child/balloon-game";

export const metadata: Metadata = {
  title: "Matheapp -- Ballonplatzen",
};

export default async function SpielPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Compute total points (same reduce pattern as dashboard) (D-16)
  const { data: entries } = await supabase
    .from("progress_entries")
    .select("points_earned")
    .eq("child_id", user.id);

  const totalPoints = (entries ?? []).reduce(
    (sum, e) => sum + (e.points_earned ?? 0),
    0
  );

  // Server-side gating: redirect if insufficient points (T-40-02)
  if (totalPoints < MINIGAME_THRESHOLD) {
    redirect("/kind/dashboard");
  }

  return <BalloonGame currentPoints={totalPoints} />;
}
