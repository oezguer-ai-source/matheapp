import { createClient } from "@/lib/supabase/server";
import { MessagesWorkspace } from "@/components/teacher/messages-workspace";

export default async function NachrichtenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", user!.id)
    .order("name");

  return <MessagesWorkspace classes={classes ?? []} />;
}
