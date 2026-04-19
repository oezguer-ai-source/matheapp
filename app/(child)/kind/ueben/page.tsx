import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopicPicker } from "@/components/child/topic-picker";
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

  const grade = profile?.grade_level ?? 1;

  const tier = await getSchoolSubscriptionTier(supabase, user.id);
  if (isGated(grade, tier)) {
    redirect("/kind/upgrade");
  }

  return <TopicPicker grade={grade} />;
}
