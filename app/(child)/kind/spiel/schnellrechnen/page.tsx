import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGame } from "@/lib/config/games";
import { QuickMathGame } from "@/components/child/quickmath-game";

export const metadata: Metadata = {
  title: "Matheapp — Schnellrechnen",
};

export default async function QuickMathPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_level")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: entries } = await supabase
    .from("progress_entries")
    .select("points_earned")
    .eq("child_id", user.id);

  const totalPoints = (entries ?? []).reduce(
    (sum, e) => sum + (e.points_earned ?? 0),
    0
  );

  const game = getGame("quickmath");
  if (totalPoints < game.unlockAt) {
    redirect("/kind/spiel");
  }

  return <QuickMathGame grade={profile?.grade_level ?? 1} />;
}
