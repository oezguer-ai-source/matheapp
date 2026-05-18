import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AddStudentForm } from "@/components/teacher/add-student-form";
import { formatName } from "@/lib/teacher/format";
import {
  aggregateProgressByChild,
  type ProgressStats,
} from "@/lib/teacher/progress";
import {
  computeStudentWarn,
  hasWarn,
  warnWeight,
  daysInactive as computeDaysInactive,
  type StudentWarn,
} from "@/lib/teacher/report";

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

  let progressMap = new Map<string, ProgressStats>();
  if (studentIds.length > 0) {
    const { data: entries } = await admin
      .from("progress_entries")
      .select("child_id, correct, points_earned, created_at")
      .in("child_id", studentIds)
      .neq("operation_type", "minigame_redeem");

    progressMap = aggregateProgressByChild(entries);
  }

  // Streak-State pro Schüler laden
  const streakMap = new Map<string, number>();
  if (studentIds.length > 0) {
    const { data: streaks } = await admin
      .from("streak_state")
      .select("child_id, current_streak")
      .in("child_id", studentIds);
    for (const s of streaks ?? []) {
      streakMap.set(s.child_id, s.current_streak);
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

  // Warn-Berechnung (zentral in lib/teacher/report.ts).
  const nowDate = new Date();
  const warnMap = new Map<string, StudentWarn>();
  for (const s of students ?? []) {
    warnMap.set(
      s.user_id,
      computeStudentWarn(progressMap.get(s.user_id), nowDate)
    );
  }
  const warnCount = (students ?? []).filter((s) => {
    const w = warnMap.get(s.user_id);
    return w ? hasWarn(w) : false;
  }).length;

  // Sortierung: Warn-Schüler zuerst, dann alphabetisch
  const sortedStudents = [...(students ?? [])].sort((a, b) => {
    const wa = warnMap.get(a.user_id);
    const wb = warnMap.get(b.user_id);
    const aWarn = wa ? warnWeight(wa) : 0;
    const bWarn = wb ? warnWeight(wb) : 0;
    if (aWarn !== bWarn) return bWarn - aWarn;
    return a.display_name.localeCompare(b.display_name, "de");
  });

  return (
    <div className="p-5 sm:p-8 lg:p-12 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Klasse {classData.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {totalStudents} Schüler &middot; {totalExercises} Aufgaben gelöst &middot; {totalPoints} Punkte gesamt
          </p>
        </div>
        <Link
          href={`/lehrer/klasse/${classData.id}/bericht`}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          📄 Klassen-Bericht
        </Link>
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
          <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hinweise</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">🔥 Streak</th>
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
                const daysInactive = computeDaysInactive(stats, nowDate);

                return (
                  <tr
                    key={student.user_id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">
                      <Link
                        href={`/lehrer/klasse/${classData.id}/schueler/${student.user_id}/bericht`}
                        className="font-medium text-indigo-700 hover:underline"
                      >
                        {formatName(student.display_name)}
                      </Link>
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
                    <td className="px-5 py-3.5 text-sm text-right">
                      {(() => {
                        const streak = streakMap.get(student.user_id) ?? 0;
                        if (streak === 0) {
                          return <span className="text-xs text-slate-300">—</span>;
                        }
                        return (
                          <span className="inline-flex items-center gap-1 font-bold text-orange-600">
                            <span>🔥</span>
                            <span>{streak}</span>
                          </span>
                        );
                      })()}
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
        </div>
      )}
    </div>
  );
}
