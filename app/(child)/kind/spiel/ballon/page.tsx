import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGame } from "@/lib/config/games";
import { getTotalPoints } from "@/lib/exercises/points";
import { getSchoolSubscriptionTier, isGated } from "@/lib/subscription/queries";
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

  // E2 — Abo-Gating: Klasse 4 ohne aktives Abo wird zur Upgrade-Seite geleitet.
  const { data: gradeProfile } = await supabase
    .from("profiles")
    .select("grade_level")
    .eq("user_id", user.id)
    .maybeSingle();
  const tier = await getSchoolSubscriptionTier(supabase, user.id);
  if (isGated(gradeProfile?.grade_level ?? 0, tier)) {
    redirect("/kind/upgrade");
  }

  const totalPoints = await getTotalPoints(supabase, user.id);

  const game = getGame("balloon");
  if (totalPoints < game.unlockAt) {
    redirect("/kind/spiel");
  }

  return <BalloonGame />;
}
