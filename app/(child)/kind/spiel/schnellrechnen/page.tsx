import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGame } from "@/lib/config/games";
import { getTotalPoints } from "@/lib/exercises/points";
import { getSchoolSubscriptionTier, isGated } from "@/lib/subscription/queries";
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

  // E2 — Abo-Gating: Klasse 4 ohne aktives Abo wird zur Upgrade-Seite geleitet.
  const tier = await getSchoolSubscriptionTier(supabase, user.id);
  if (isGated(profile?.grade_level ?? 0, tier)) {
    redirect("/kind/upgrade");
  }

  const totalPoints = await getTotalPoints(supabase, user.id);

  const game = getGame("quickmath");
  if (totalPoints < game.unlockAt) {
    redirect("/kind/spiel");
  }

  return <QuickMathGame grade={profile?.grade_level ?? 1} />;
}
