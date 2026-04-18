import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExerciseSession } from "@/components/child/exercise-session";

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

  return <ExerciseSession grade={profile.grade_level} />;
}
