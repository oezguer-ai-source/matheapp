import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AufgabenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // Aufgaben laden
  const { data: assignments } = await admin
    .from("assignments")
    .select("id, title, description, due_date, created_at")
    .eq("teacher_id", user!.id)
    .order("created_at", { ascending: false });

  // Klassen-Zuweisungen + Abgabe-Statistiken parallel.
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const classMap = new Map<string, string[]>();
  const submissionStats = new Map<string, { total: number; submitted: number }>();

  if (assignmentIds.length > 0) {
    const [acRes, subsRes] = await Promise.all([
      admin
        .from("assignment_classes")
        .select("assignment_id, class_id")
        .in("assignment_id", assignmentIds),
      admin
        .from("assignment_submissions")
        .select("assignment_id, status")
        .in("assignment_id", assignmentIds),
    ]);

    const acRows = acRes.data;
    const classIds = [...new Set((acRows ?? []).map((r) => r.class_id))];
    const classNameMap = new Map<string, string>();

    if (classIds.length > 0) {
      const { data: classes } = await admin
        .from("classes")
        .select("id, name")
        .in("id", classIds);
      for (const c of classes ?? []) {
        classNameMap.set(c.id, c.name);
      }
    }

    for (const row of acRows ?? []) {
      const name = classNameMap.get(row.class_id);
      if (name) {
        const existing = classMap.get(row.assignment_id) ?? [];
        existing.push(name);
        classMap.set(row.assignment_id, existing);
      }
    }

    for (const s of subsRes.data ?? []) {
      const existing = submissionStats.get(s.assignment_id) ?? { total: 0, submitted: 0 };
      existing.total += 1;
      if (s.status === "submitted") existing.submitted += 1;
      submissionStats.set(s.assignment_id, existing);
    }
  }

  const now = new Date();

  return (
    <div className="p-8 lg:p-12 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Aufgaben</h1>
          <p className="text-sm text-slate-500 mt-1">
            {assignments?.length ?? 0} Aufgaben erstellt
          </p>
        </div>
        <Link
          href="/lehrer/aufgaben/neu"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Neue Aufgabe
        </Link>
      </div>

      {(!assignments || assignments.length === 0) ? (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-10 text-center">
          <p className="text-5xl mb-4">📝</p>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Noch keine Aufgaben
          </h2>
          <p className="text-base text-slate-600 max-w-md mx-auto">
            Erstellen Sie Ihre erste Aufgabe mit dem Baukasten — Freitext oder
            Multiple-Choice — und weisen Sie sie Ihren Klassen zu.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((a, idx) => {
            const dueDate = new Date(a.due_date);
            const isOverdue = dueDate < now;
            const classNames = classMap.get(a.id)?.join(", ") ?? "";
            const stats = submissionStats.get(a.id);

            return (
              <Link
                key={a.id}
                href={`/lehrer/aufgaben/${a.id}`}
                className="group block animate-fade-in"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                        {a.title}
                      </h3>
                      {a.description && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                          {a.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        {classNames && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347" />
                            </svg>
                            {classNames}
                          </span>
                        )}
                        {stats && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Z" />
                            </svg>
                            {stats.submitted}/{stats.total} abgegeben
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full ${
                        isOverdue
                          ? "bg-red-50 text-red-600 border border-red-100"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}
                    >
                      {isOverdue ? "Abgelaufen" : `Bis ${dueDate.toLocaleDateString("de-DE")}`}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
