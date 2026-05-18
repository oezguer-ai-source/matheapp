import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/teacher/auth";
import { aggregateProgressByChild } from "@/lib/teacher/progress";
import {
  buildClassReport,
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentRow,
  type SubmissionRow,
  type OperationEntryRow,
  type AssignmentStatusKey,
} from "@/lib/teacher/report";
import { ReportPrintButton } from "@/components/teacher/report-print-button";

/**
 * Druckbarer Klassen-Bericht.
 *
 * Bietet mehr Tiefe als der Schueler-/Eltern-Bericht: Gesamtgenauigkeit,
 * Genauigkeit pro Rechenart, Verteilung der Aufgaben-Stati, Risiko-Schueler
 * und konkrete Handlungsempfehlungen ("wo ansetzen").
 *
 * Sicherheit: requireTeacher() + Klassen-Ownership (teacher_id == userId).
 */
export default async function KlassenBerichtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  // 3. Schueler der Klasse laden.
  const { data: studentRows } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("class_id", classData.id)
    .eq("role", "child");

  const students = (studentRows ?? []).map((s) => ({
    userId: s.user_id,
    username: s.display_name,
  }));
  const studentIds = students.map((s) => s.userId);

  // 4. Fortschritt, Rechenart-Eintraege und Streaks laden.
  const progressByChild =
    studentIds.length > 0
      ? aggregateProgressByChild(
          (
            await admin
              .from("progress_entries")
              .select("child_id, correct, points_earned, created_at")
              .in("child_id", studentIds)
              .neq("operation_type", "minigame_redeem")
          ).data
        )
      : new Map();

  let operationEntries: OperationEntryRow[] = [];
  const streakByChild = new Map<string, number>();
  if (studentIds.length > 0) {
    const { data: opEntries } = await admin
      .from("progress_entries")
      .select("operation_type, correct")
      .in("child_id", studentIds)
      .neq("operation_type", "minigame_redeem");
    operationEntries = opEntries ?? [];

    const { data: streaks } = await admin
      .from("streak_state")
      .select("child_id, current_streak")
      .in("child_id", studentIds);
    for (const s of streaks ?? []) {
      streakByChild.set(s.child_id, s.current_streak);
    }
  }

  // 5. Lehrer-Aufgaben dieser Klasse + Abgaben laden.
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
    assignments = aRows ?? [];

    const { data: sRows } = await admin
      .from("assignment_submissions")
      .select("assignment_id, student_id, status, submitted_at")
      .in("assignment_id", assignmentIds);
    submissions = sRows ?? [];
  }

  // 6. Bericht aufbauen.
  const report = buildClassReport({
    className: classData.name,
    students,
    progressByChild,
    streakByChild,
    operationEntries,
    assignments,
    submissions,
  });

  const generatedAt = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const statusKeys: AssignmentStatusKey[] = [
    "submitted",
    "in_progress",
    "open",
    "overdue",
  ];

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
          Klassen-Lernbericht
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Klasse {report.className}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Erstellt am {generatedAt} &middot; {report.totalStudents} Schüler
        </p>
      </header>

      {/* Kennzahlen */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Überblick
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KennzahlCard
            label="Schüler"
            value={String(report.totalStudents)}
          />
          <KennzahlCard
            label="Aufgaben gelöst"
            value={String(report.totalExercises)}
          />
          <KennzahlCard label="Punkte gesamt" value={String(report.totalPoints)} />
          <KennzahlCard
            label="Gesamtgenauigkeit"
            value={report.accuracy !== null ? `${report.accuracy}%` : "–"}
          />
        </div>
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
                <tr
                  key={op.operation}
                  className="border-t border-slate-100"
                >
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

      {/* Aufgaben-Status */}
      {report.assignmentCount > 0 && (
        <section className="mb-8 break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Lehrer-Aufgaben ({report.assignmentCount}{" "}
            {report.assignmentCount === 1 ? "Aufgabe" : "Aufgaben"})
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statusKeys.map((key) => (
              <div
                key={key}
                className="rounded-lg border border-slate-200 px-4 py-3"
              >
                <p className="text-2xl font-bold text-slate-900">
                  {report.assignmentDistribution[key]}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {ASSIGNMENT_STATUS_LABELS[key]}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Risiko-Schueler */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Schüler mit Förderbedarf ({report.atRiskStudents.length})
        </h2>
        {report.atRiskStudents.length === 0 ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Aktuell keine auffälligen Schüler — alle üben regelmäßig und mit
            ausreichender Trefferquote.
          </p>
        ) : (
          <ul className="space-y-2">
            {report.atRiskStudents.map((s) => (
              <li
                key={s.userId}
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-slate-900">
                  {s.displayName}
                </span>
                <span className="ml-2 text-slate-600">
                  {[
                    s.warn.neverActive && "noch nie aktiv",
                    s.warn.inactive &&
                      s.inactiveDays !== null &&
                      `${s.inactiveDays} Tage inaktiv`,
                    s.warn.lowAccuracy &&
                      s.accuracy !== null &&
                      `nur ${s.accuracy}% richtig`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Schueler-Tabelle */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Alle Schüler
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5 text-right">Punkte</th>
                <th className="px-4 py-2.5 text-right">Aufgaben</th>
                <th className="px-4 py-2.5 text-right">Genauigkeit</th>
                <th className="px-4 py-2.5 text-right">Streak</th>
              </tr>
            </thead>
            <tbody>
              {report.students.map((s) => (
                <tr key={s.userId} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {s.displayName}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {s.stats.points}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {s.stats.total}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                    {s.accuracy !== null ? `${s.accuracy}%` : "–"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {s.streak > 0 ? s.streak : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        Matheapp · Klassen-Lernbericht · Vertraulich — nur für den schulischen
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
