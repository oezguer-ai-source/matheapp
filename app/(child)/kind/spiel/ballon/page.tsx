import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGame } from "@/lib/config/games";
import { BalloonGame } from "@/components/child/balloon-game";

export const metadata: Metadata = {
  title: "Matheapp — Ballonplatzen",
};

export default async function BalloonGamePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const { data: entries } = await supabase
    .from("progress_entries")
    .select("points_earned")
    .eq("child_id", user.id);

  const totalPoints = (entries ?? []).reduce(
    (sum, e) => sum + (e.points_earned ?? 0),
    0
  );

  const game = getGame("balloon");
  if (totalPoints < game.unlockAt) {
    redirect("/kind/spiel");
  }

  return <BalloonGame />;
}
