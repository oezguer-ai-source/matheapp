import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function KindAufgabenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("class_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.class_id) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <p className="text-4xl mb-4">📋</p>
        <p className="text-lg text-slate-600">Du bist noch keiner Klasse zugeordnet.</p>
      </div>
    );
  }

  // Zugewiesene Aufgaben laden
  const { data: assignedRows } = await supabase
    .from("assignment_classes")
    .select("assignment_id")
    .eq("class_id", profile.class_id);

  const assignmentIds = (assignedRows ?? []).map((r) => r.assignment_id);

  if (assignmentIds.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center animate-fade-in">
        <p className="text-5xl mb-4">🎉</p>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Keine Aufgaben!</h2>
        <p className="text-base text-slate-500">Du hast gerade keine Aufgaben von deinem Lehrer.</p>
      </div>
    );
  }

  // Aufgaben laden
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, description, due_date")
    .in("id", assignmentIds)
    .order("due_date", { ascending: true });

  // Abgaben des Schülers laden
  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("assignment_id, status")
    .eq("student_id", user.id)
    .in("assignment_id", assignmentIds);

  const submissionMap = new Map(
    (submissions ?? []).map((s) => [s.assignment_id, s.status])
  );

  const now = new Date();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-6 animate-fade-in">
        📋 Meine Aufgaben
      </h1>

      <div className="grid gap-4">
        {(assignments ?? []).map((a) => {
          const status = submissionMap.get(a.id);
          const dueDate = new Date(a.due_date);
          const isOverdue = dueDate < now && status !== "submitted";
          const isSubmitted = status === "submitted";
          const isInProgress = status === "in_progress";

          return (
            <Link
              key={a.id}
              href={`/kind/aufgaben/${a.id}`}
              className="glass-card rounded-2xl p-5 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all animate-fade-in"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-800 truncate">{a.title}</h3>
                  {a.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{a.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    Fällig: {dueDate.toLocaleDateString("de-DE")}
                  </p>
                </div>

                {/* Status-Badge */}
                {isSubmitted ? (
                  <span className="shrink-0 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                    ✅ Abgegeben
                  </span>
                ) : isOverdue ? (
                  <span className="shrink-0 px-3 py-1.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                    ⏰ Überfällig
                  </span>
                ) : isInProgress ? (
                  <span className="shrink-0 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    ✍️ Angefangen
                  </span>
                ) : (
                  <span className="shrink-0 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    📝 Neu
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
