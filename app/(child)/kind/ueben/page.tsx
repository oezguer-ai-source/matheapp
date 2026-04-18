import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExerciseSession } from "@/components/child/exercise-session";
import { getSchoolSubscriptionTier, isGated } from "@/lib/subscription/queries";

export default async function UebenPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_level")
    .eq("user_id", user.id)
    .single();

  if (!profile?.grade_level) {
    redirect("/kind/dashboard");
  }

  // Subscription-Gate: Klasse 4 an free-Schulen wird umgeleitet (D-01, D-04)
  // Klasse 1-3 und demo-Tier werden durchgelassen (D-02, D-12)
  const tier = await getSchoolSubscriptionTier(supabase, user.id);
  if (isGated(profile.grade_level, tier)) {
    redirect("/kind/upgrade");
  }

  return <ExerciseSession grade={profile.grade_level} />;
}
