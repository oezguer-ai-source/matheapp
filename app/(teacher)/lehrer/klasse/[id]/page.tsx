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

      <div className="mb-8">
        <AddStudentForm classId={classData.id} />
      </div>

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
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Benutzername</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Punkte</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Aufgaben</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Genauigkeit</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Letzte Aktivität</th>
              </tr>
            </thead>
            <tbody>
              {(students ?? []).map((student) => {
                const stats = progressMap.get(student.user_id);
                const accuracy = stats && stats.total > 0
                  ? Math.round((stats.correct / stats.total) * 100)
                  : null;
                const lastDate = stats?.lastAt
                  ? new Date(stats.lastAt).toLocaleDateString("de-DE")
                  : null;

                return (
                  <tr
                    key={student.user_id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">
                      {formatName(student.display_name)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-400 font-mono">
                      {student.display_name}
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
