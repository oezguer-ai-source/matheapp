import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/teacher/auth";
import { aggregateProgress } from "@/lib/teacher/progress";
import { buildProgressTimeline } from "@/lib/exercises/progress-timeline";
import {
  buildStudentReport,
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentRow,
  type SubmissionRow,
  type OperationEntryRow,
  type AssignmentStatusKey,
} from "@/lib/teacher/report";
import { ReportPrintButton } from "@/components/teacher/report-print-button";

/**
 * Druckbarer Schueler-Bericht.
 *
 * Verschachtelt unter klasse/[id] — damit die Ownership-Pruefung sauber ist:
 * der Lehrer muss die Klasse besitzen UND der Schueler muss in genau dieser
 * Klasse sein. Beides wird hier konsequent geprueft.
 *
 * Der Bericht ist datendichter als der Eltern-/Schueler-Bericht: Genauigkeit
 * pro Rechenart, Lehrer-Aufgaben-Status, 8-Wochen-Verlauf und konkrete
 * Handlungsempfehlungen.
 */
export default async function SchuelerBerichtPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id, studentId } = await params;

  // 1. Rollen-Pruefung.
  const auth = await requireTeacher();
  if (!auth.ok) redirect("/login");
  const { userId } = auth;

  const supabase = await createClient();
  const admin = createAdminClient();

  // 2. Klassen-Ownership: Klasse muss dem angemeldeten Lehrer gehoeren.
  const { data: classData } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", id)
    .eq("teacher_id", userId)
    .maybeSingle();

  if (!classData) notFound();

  // 3. Schueler-Ownership: Schueler muss ein Kind GENAU dieser Klasse sein.
  const { data: studentProfile } = await admin
    .from("profiles")
    .select("user_id, display_name, class_id, role")
    .eq("user_id", studentId)
    .maybeSingle();

  if (
    !studentProfile ||
    studentProfile.role !== "child" ||
    studentProfile.class_id !== classData.id
  ) {
    notFound();
  }

  // 4. Fortschritt + Rechenart-Eintraege laden.
  const { data: entries } = await admin
    .from("progress_entries")
    .select("operation_type, correct, points_earned, created_at")
    .eq("child_id", studentId)
    .neq("operation_type", "minigame_redeem");

  const stats = aggregateProgress(entries);
  const operationEntries: OperationEntryRow[] = (entries ?? []).map((e) => ({
    operation_type: e.operation_type,
    correct: e.correct,
  }));
  const timeline = buildProgressTimeline(entries);

  // 5. Streak laden.
  const { data: streakRow } = await admin
    .from("streak_state")
    .select("current_streak")
    .eq("child_id", studentId)
    .maybeSingle();
  const streak = streakRow?.current_streak ?? 0;

  // 6. Lehrer-Aufgaben dieser Klasse + Abgaben des Schuelers laden.
  const { data: assignmentClassRows } = await admin
    .from("assignment_classes")
    .select("assignment_id")
    .eq("class_id", classData.id);
  const assignmentIds = (assignmentClassRows ?? []).map((r) => r.assignment_id);

  let assignments: AssignmentRow[] = [];
  let submissions: SubmissionRow[] = [];
  if (assignmentIds.length > 0) {
    const { data: aRows } = await admin
      .from("assignments")
      .select("id, title, due_date")
      .in("id", assignmentIds);
    assignments = (aRows ?? []).sort(
      (a, b) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    const { data: sRows } = await admin
      .from("assignment_submissions")
      .select("assignment_id, student_id, status, submitted_at")
      .in("assignment_id", assignmentIds)
      .eq("student_id", studentId);
    submissions = sRows ?? [];
  }

  // 7. Bericht aufbauen.
  const report = buildStudentReport({
    username: studentProfile.display_name,
    className: classData.name,
    stats,
    operationEntries,
    streak,
    assignments,
    submissions,
    timeline,
  });

  const generatedAt = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const maxWeekExercises = Math.max(
    1,
    ...report.timeline.map((w) => w.exercises)
  );

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 sm:p-10 text-slate-800 print:max-w-none print:p-0">
      {/* Aktionsleiste — wird nicht gedruckt */}
      <div className="print:hidden mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/lehrer/klasse/${classData.id}`}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Zurück zur Klasse
        </Link>
        <ReportPrintButton />
      </div>

      {/* Kopf */}
      <header className="mb-8 border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          Schüler-Lernbericht
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          {report.displayName}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Klasse {report.className} &middot; Erstellt am {generatedAt}
        </p>
      </header>

      {/* Kennzahlen */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Überblick</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KennzahlCard label="Punkte" value={String(report.stats.points)} />
          <KennzahlCard
            label="Aufgaben gelöst"
            value={String(report.stats.total)}
          />
          <KennzahlCard
            label="Genauigkeit"
            value={report.stats.total > 0 ? `${report.accuracy}%` : "–"}
          />
          <KennzahlCard
            label="Aktueller Streak"
            value={report.streak > 0 ? `${report.streak} Tage` : "–"}
          />
        </div>
        {(report.warn.inactive || report.warn.neverActive) && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            {report.warn.neverActive
              ? "Hinweis: Dieser Schüler hat noch keine Aufgabe gelöst."
              : `Hinweis: Seit ${report.inactiveDays} Tagen keine Aktivität.`}
          </p>
        )}
      </section>

      {/* Genauigkeit pro Rechenart */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Genauigkeit pro Rechenart
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Rechenart</th>
                <th className="px-4 py-2.5 text-right">Aufgaben</th>
                <th className="px-4 py-2.5 text-right">Richtig</th>
                <th className="px-4 py-2.5 text-right">Genauigkeit</th>
              </tr>
            </thead>
            <tbody>
              {report.operations.map((op) => (
                <tr key={op.operation} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {op.label}
                    {report.weakest?.operation === op.operation && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        Schwerpunkt
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {op.total}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {op.correct}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                    {op.total > 0 ? `${op.accuracy}%` : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 8-Wochen-Verlauf */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Verlauf der letzten 8 Wochen
        </h2>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
            {report.timeline.map((week) => {
              const heightPct = (week.exercises / maxWeekExercises) * 100;
              return (
                <div
                  key={week.week}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <span className="text-[10px] font-medium text-slate-500">
                    {week.exercises > 0 ? week.exercises : ""}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-indigo-500"
                      style={{
                        height: `${Math.max(heightPct, week.exercises > 0 ? 6 : 0)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {week.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Balkenhöhe = gelöste Aufgaben pro Kalenderwoche.
          </p>
        </div>
      </section>

      {/* Lehrer-Aufgaben */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Lehrer-Aufgaben
        </h2>
        {report.assignments.length === 0 ? (
          <p className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-500">
            Dieser Klasse wurden noch keine Aufgaben zugewiesen.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5">Aufgabe</th>
                  <th className="px-4 py-2.5">Frist</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.assignments.map((a) => (
                  <tr
                    key={a.assignmentId}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {a.title}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {new Date(a.dueDate).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <AssignmentStatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Handlungsempfehlungen */}
      <section className="mb-4 break-inside-avoid rounded-lg border border-indigo-200 bg-indigo-50 p-5">
        <h2 className="mb-3 text-lg font-semibold text-indigo-900">
          Handlungsempfehlungen — wo ansetzen?
        </h2>
        <ul className="space-y-2">
          {report.recommendations.map((rec, i) => (
            <li key={i} className="flex gap-2 text-sm text-indigo-900">
              <span className="font-bold text-indigo-500">→</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400">
        Matheapp · Schüler-Lernbericht · Vertraulich — nur für den schulischen
        Gebrauch.
      </footer>
    </div>
  );
}

function KennzahlCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 px-4 py-3">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function AssignmentStatusBadge({ status }: { status: AssignmentStatusKey }) {
  const styles: Record<AssignmentStatusKey, string> = {
    submitted: "bg-green-100 text-green-700",
    in_progress: "bg-indigo-100 text-indigo-700",
    open: "bg-slate-100 text-slate-600",
    overdue: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {ASSIGNMENT_STATUS_LABELS[status]}
    </span>
  );
}
