import { createClient } from "@/lib/supabase/server";
import { AssignmentBuilder } from "@/components/teacher/assignment-builder";

export default async function NeueAufgabePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Klassen des Lehrers laden für die Zuweisung
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", user!.id)
    .order("name");

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">
        Neue Aufgabe erstellen
      </h1>
      <AssignmentBuilder classes={classes ?? []} />
    </div>
  );
}
