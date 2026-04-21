import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AddStudentForm } from "@/components/teacher/add-student-form";

function formatName(username: string): string {
  return username
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function KlasseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: classData } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!classData) notFound();

  // Schüler laden
  const { data: students } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("class_id", classData.id)
    .eq("role", "child")
    .order("display_name", { ascending: true });

  // Fortschritt aller Schüler laden
  const studentIds = (students ?? []).map((s) => s.user_id);
  const admin = createAdminClient();

  const progressMap = new Map<string, { points: number; total: number; correct: number; lastAt: string | null }>();
  if (studentIds.length > 0) {
    const { data: entries } = await admin
      .from("progress_entries")
      .select("child_id, correct, points_earned, created_at")
      .in("child_id", studentIds)
      .neq("operation_type", "minigame_redeem");

    for (const entry of entries ?? []) {
      const existing = progressMap.get(entry.child_id) ?? { points: 0, total: 0, correct: 0, lastAt: null };
      existing.points += entry.points_earned ?? 0;
      existing.total += 1;
      if (entry.correct) existing.correct += 1;
      if (entry.created_at && (!existing.lastAt || entry.created_at > existing.lastAt)) {
        existing.lastAt = entry.created_at;
      }
      progressMap.set(entry.child_id, existing);
    }
  }

  // Klassen-Statistiken
  const totalStudents = students?.length ?? 0;
  let totalPoints = 0;
  let totalExercises = 0;
  for (const stats of progressMap.values()) {
    totalPoints += stats.points;
    totalExercises += stats.total;
  }

  // Warn-Berechnung: inaktiv >5 Tage, niedrige Quote <40% bei >=10 Aufgaben
  const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  type StudentWarn = {
    inactive: boolean;
    lowAccuracy: boolean;
    neverActive: boolean;
  };
  const warnMap = new Map<string, StudentWarn>();
  for (const s of students ?? []) {
    const stats = progressMap.get(s.user_id);
    const lastMs = stats?.lastAt ? new Date(stats.lastAt).getTime() : 0;
    const daysSince = lastMs ? (now - lastMs) / FIVE_DAYS_MS : Infinity;
    const accuracy =
      stats && stats.total > 0
        ? Math.round((stats.correct / stats.total) * 100)
        : null;
    warnMap.set(s.user_id, {
      inactive: lastMs > 0 && daysSince >= 1,
      lowAccuracy: (stats?.total ?? 0) >= 10 && (accuracy ?? 100) < 40,
      neverActive: !lastMs,
    });
  }
  const warnCount = (students ?? []).filter((s) => {
    const w = warnMap.get(s.user_id);
    return w && (w.inactive || w.lowAccuracy || w.neverActive);
  }).length;

  // Sortierung: Warn-Schüler zuerst, dann alphabetisch
  const sortedStudents = [...(students ?? [])].sort((a, b) => {
    const wa = warnMap.get(a.user_id);
    const wb = warnMap.get(b.user_id);
    const aWarn = (wa?.inactive ? 1 : 0) + (wa?.lowAccuracy ? 1 : 0) + (wa?.neverActive ? 1 : 0);
    const bWarn = (wb?.inactive ? 1 : 0) + (wb?.lowAccuracy ? 1 : 0) + (wb?.neverActive ? 1 : 0);
    if (aWarn !== bWarn) return bWarn - aWarn;
    return a.display_name.localeCompare(b.display_name, "de");
  });

  return (
    <div className="p-8 lg:p-12 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Klasse {classData.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {totalStudents} Schüler &middot; {totalExercises} Aufgaben gelöst &middot; {totalPoints} Punkte gesamt
          </p>
        </div>
      </div>

      <div className="mb-6">
        <AddStudentForm classId={classData.id} />
      </div>

      {warnCount > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 flex items-center gap-4">
          <div className="text-3xl">⚠️</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">
              {warnCount}{" "}
              {warnCount === 1 ? "Schüler braucht" : "Schüler brauchen"}{" "}
              Aufmerksamkeit
            </p>
            <p className="text-xs text-amber-800">
              Lange nicht geübt, niedrige Trefferquote oder noch nie aktiv — siehe Badges in der Tabelle.
            </p>
          </div>
        </div>
      )}

      {totalStudents === 0 ? (
        <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 p-8 text-center">
          <p className="text-4xl mb-3">👩‍🎓</p>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Noch keine Schüler</h2>
          <p className="text-sm text-slate-600">
            Fügen Sie Schüler über den Button oben hinzu.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hinweise</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Punkte</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Aufgaben</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Genauigkeit</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Letzte Aktivität</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student) => {
                const stats = progressMap.get(student.user_id);
                const accuracy = stats && stats.total > 0
                  ? Math.round((stats.correct / stats.total) * 100)
                  : null;
                const lastDate = stats?.lastAt
                  ? new Date(stats.lastAt).toLocaleDateString("de-DE")
                  : null;
                const warn = warnMap.get(student.user_id);
                const daysInactive = stats?.lastAt
                  ? Math.floor((now - new Date(stats.lastAt).getTime()) / (24 * 60 * 60 * 1000))
                  : null;

                return (
                  <tr
                    key={student.user_id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        {formatName(student.display_name)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {student.display_name}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {warn?.neverActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                            ⏸ noch nie aktiv
                          </span>
                        )}
                        {warn?.inactive && !warn?.neverActive && daysInactive !== null && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            💤 {daysInactive} {daysInactive === 1 ? "Tag" : "Tage"} inaktiv
                          </span>
                        )}
                        {warn?.lowAccuracy && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            📉 schwache Quote
                          </span>
                        )}
                        {!warn?.inactive && !warn?.lowAccuracy && !warn?.neverActive && (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right font-semibold text-slate-700">
                      {stats?.points ?? 0}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right text-slate-600">
                      {stats?.total ?? 0}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {accuracy !== null ? (
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          accuracy >= 75 ? "bg-green-50 text-green-700" :
                          accuracy >= 50 ? "bg-amber-50 text-amber-700" :
                          "bg-red-50 text-red-600"
                        }`}>
                          {accuracy}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right text-slate-500">
                      {lastDate ?? "--"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
