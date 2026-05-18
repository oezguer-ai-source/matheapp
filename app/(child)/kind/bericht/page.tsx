import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTotalPoints } from "@/lib/exercises/points";
import { fetchAvatarSnapshot } from "@/lib/avatar/service";
import { fetchOperationAccuracy } from "@/lib/teacher/queries";
import { buildProgressTimeline } from "@/lib/exercises/progress-timeline";
import { ReportPrintButton } from "@/components/child/report-print-button";

export const metadata: Metadata = {
  title: "Matheapp — Lern-Bericht",
};

/** Anzeige-Konfiguration der vier Rechenarten. */
const OPERATION_LABELS: Record<string, { name: string; emoji: string }> = {
  addition: { name: "Addition", emoji: "➕" },
  subtraktion: { name: "Subtraktion", emoji: "➖" },
  multiplikation: { name: "Multiplikation", emoji: "✖️" },
  division: { name: "Division", emoji: "➗" },
};

/** Farbgebung der Genauigkeits-Balken je nach Niveau. */
function accuracyTone(accuracy: number, total: number): string {
  if (total === 0) return "bg-slate-300";
  if (accuracy >= 80) return "bg-green-500";
  if (accuracy >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default async function KindBerichtPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, grade_level, class_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login");

  const displayName = profile.display_name
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  // (a) Kennzahlen: Punkte, geloeste Aufgaben, Streak.
  const [totalPoints, avatar, operationAccuracy, allEntries] =
    await Promise.all([
      getTotalPoints(supabase, user.id),
      fetchAvatarSnapshot(supabase, user.id),
      // (b) Genauigkeit pro Rechenart — funktioniert auch mit dem RLS-Client
      // des Kindes (liest nur eigene progress_entries).
      fetchOperationAccuracy(supabase, user.id),
      // (d) Eintraege fuer den Wochen-Verlauf (ohne minigame_redeem).
      supabase
        .from("progress_entries")
        .select("correct, points_earned, created_at")
        .eq("child_id", user.id)
        .neq("operation_type", "minigame_redeem"),
    ]);

  const exerciseCount = operationAccuracy.reduce((s, o) => s + o.total, 0);
  const correctCount = operationAccuracy.reduce((s, o) => s + o.correct, 0);
  const overallAccuracy =
    exerciseCount > 0
      ? Math.round((correctCount / exerciseCount) * 100)
      : 0;

  const timeline = buildProgressTimeline(allEntries.data);
  const maxWeekExercises = Math.max(
    1,
    ...timeline.map((w) => w.exercises)
  );

  // (c) Status der Lehrer-Aufgaben.
  let assignmentTotal = 0;
  let assignmentDone = 0;
  if (profile.class_id) {
    const { data: assignedRows } = await supabase
      .from("assignment_classes")
      .select("assignment_id")
      .eq("class_id", profile.class_id);

    const assignmentIds = (assignedRows ?? []).map((r) => r.assignment_id);
    assignmentTotal = assignmentIds.length;

    if (assignmentIds.length > 0) {
      const { data: submissions } = await supabase
        .from("assignment_submissions")
        .select("assignment_id, status")
        .eq("student_id", user.id)
        .eq("status", "submitted")
        .in("assignment_id", assignmentIds);

      assignmentDone = new Set(
        (submissions ?? []).map((s) => s.assignment_id)
      ).size;
    }
  }
  const assignmentOpen = assignmentTotal - assignmentDone;

  const printDate = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // "Hier noch ueben": Rechenarten mit Niveau unter 80 % (und Daten vorhanden).
  const weakOperations = operationAccuracy.filter(
    (o) => o.total > 0 && o.accuracy < 80
  );

  return (
    <div className="p-6 max-w-2xl mx-auto print:p-0 print:max-w-none">
      {/* Kopf */}
      <header className="mb-6 animate-fade-in break-inside-avoid">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">
              📊 Lern-Bericht
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {displayName} · Klassenstufe {profile.grade_level ?? 1} ·
              erstellt am {printDate}
            </p>
          </div>
          <div className="print:hidden">
            <ReportPrintButton />
          </div>
        </div>
        <p className="text-sm text-slate-400 mt-3 print:hidden">
          Dieser Bericht zeigt Eltern, wie weit das Kind ist und wo es noch
          üben sollte. Mit dem Knopf oben kann er als PDF gespeichert oder
          ausgedruckt werden.
        </p>
      </header>

      {/* (a) Kennzahlen */}
      <section className="mb-6 break-inside-avoid">
        <h2 className="text-lg font-bold text-slate-700 mb-3">
          Überblick
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-3xl font-extrabold text-child-gradient">
              {totalPoints}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Punkte gesamt
            </p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-3xl font-extrabold text-slate-700">
              {exerciseCount}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Aufgaben gelöst
            </p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="text-3xl font-extrabold text-orange-500">
              🔥 {avatar.currentStreak}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Tage-Streak
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-3">
          Gesamt-Trefferquote:{" "}
          <span className="font-bold text-slate-700">
            {overallAccuracy} %
          </span>{" "}
          · beste Streak: {avatar.bestStreak} Tage · Level {avatar.level}
        </p>
      </section>

      {/* (b) Genauigkeit pro Rechenart */}
      <section className="mb-6 break-inside-avoid">
        <h2 className="text-lg font-bold text-slate-700 mb-3">
          Genauigkeit pro Rechenart
        </h2>
        <div className="glass-card rounded-2xl p-4 space-y-3">
          {operationAccuracy.map((op) => {
            const meta = OPERATION_LABELS[op.operation_type] ?? {
              name: op.operation_type,
              emoji: "🔢",
            };
            return (
              <div key={op.operation_type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold text-slate-700">
                    {meta.emoji} {meta.name}
                  </span>
                  <span className="text-slate-500">
                    {op.total > 0
                      ? `${op.accuracy} % · ${op.correct}/${op.total}`
                      : "noch keine Aufgaben"}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${accuracyTone(
                      op.accuracy,
                      op.total
                    )}`}
                    style={{
                      width: `${op.total > 0 ? op.accuracy : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {weakOperations.length > 0 && (
          <p className="text-sm text-slate-600 mt-3">
            💡 Hier lohnt sich noch Übung:{" "}
            <span className="font-semibold">
              {weakOperations
                .map((o) => OPERATION_LABELS[o.operation_type]?.name)
                .join(", ")}
            </span>
            .
          </p>
        )}
      </section>

      {/* (c) Lehrer-Aufgaben */}
      <section className="mb-6 break-inside-avoid">
        <h2 className="text-lg font-bold text-slate-700 mb-3">
          Aufgaben vom Lehrer
        </h2>
        <div className="glass-card rounded-2xl p-4">
          {assignmentTotal === 0 ? (
            <p className="text-sm text-slate-500">
              Aktuell sind keine Aufgaben zugewiesen.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-extrabold text-slate-700">
                    {assignmentTotal}
                  </p>
                  <p className="text-xs text-slate-500">zugewiesen</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-green-600">
                    {assignmentDone}
                  </p>
                  <p className="text-xs text-slate-500">erledigt</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-amber-600">
                    {assignmentOpen}
                  </p>
                  <p className="text-xs text-slate-500">offen</p>
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{
                    width: `${
                      assignmentTotal > 0
                        ? (assignmentDone / assignmentTotal) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* (d) Wochen-Verlauf */}
      <section className="mb-6 break-inside-avoid">
        <h2 className="text-lg font-bold text-slate-700 mb-3">
          Entwicklung der letzten 8 Wochen
        </h2>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-end justify-between gap-2 h-40">
            {timeline.map((week) => {
              const heightPercent =
                (week.exercises / maxWeekExercises) * 100;
              return (
                <div
                  key={week.week}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <span className="text-xs font-semibold text-slate-600">
                    {week.exercises}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-child-cta"
                      style={{
                        height: `${Math.max(heightPercent, 2)}%`,
                      }}
                      title={`${week.exercises} Aufgaben · ${week.points} Punkte`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {week.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Anzahl gelöster Aufgaben pro Kalenderwoche (Wochenbeginn).
          </p>
        </div>
      </section>

      <footer className="text-center text-xs text-slate-400 mt-8">
        Matheapp · Lern-Bericht für Eltern
      </footer>
    </div>
  );
}
