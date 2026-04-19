import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AssignmentSolver } from "@/components/child/assignment-solver";

const MAX_ATTEMPTS = 3;

export default async function KindAufgabeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Aufgabe laden
  const { data: assignment } = await admin
    .from("assignments")
    .select("id, title, description, due_date")
    .eq("id", id)
    .maybeSingle();

  if (!assignment) notFound();

  // Items laden (ohne correct_options — die sieht der Schüler nicht)
  const { data: items } = await admin
    .from("assignment_items")
    .select("id, sort_order, item_type, question, options")
    .eq("assignment_id", id)
    .order("sort_order");

  // Abgabe-Status laden
  const { data: submission } = await admin
    .from("assignment_submissions")
    .select("id, status, submitted_at, duration_seconds, attempts_used")
    .eq("assignment_id", id)
    .eq("student_id", user.id)
    .maybeSingle();

  const attemptsUsed = (submission as { attempts_used?: number } | null)?.attempts_used ?? 0;
  const isSubmitted = submission?.status === "submitted";
  const isLocked = attemptsUsed >= MAX_ATTEMPTS;

  // Bestehende Antworten + Korrektheit laden
  let existingAnswers: { item_id: string; text_answer: string | null; selected_options: number[] | null; is_correct: boolean | null }[] = [];
  if (submission) {
    const { data: answers } = await admin
      .from("submission_answers")
      .select("item_id, text_answer, selected_options, is_correct")
      .eq("submission_id", submission.id);
    existingAnswers = (answers ?? []).map((a) => ({
      item_id: a.item_id,
      text_answer: a.text_answer,
      selected_options: a.selected_options as number[] | null,
      is_correct: a.is_correct as boolean | null,
    }));
  }

  const dueDate = new Date(assignment.due_date);

  // Anzeige wenn abgegeben oder gesperrt
  if (isSubmitted || isLocked) {
    const allCorrect = existingAnswers.every((a) => a.is_correct === true || a.is_correct === null);
    const correctCount = existingAnswers.filter((a) => a.is_correct === true).length;
    const wrongCount = existingAnswers.filter((a) => a.is_correct === false).length;
    const pendingCount = existingAnswers.filter((a) => a.is_correct === null).length;

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-extrabold text-slate-800">{assignment.title}</h1>
          <p className="text-sm text-slate-400 mt-2">
            Fällig bis: {dueDate.toLocaleDateString("de-DE")}
          </p>
        </div>

        {/* Ergebnis-Übersicht */}
        <div className={`glass-card rounded-2xl p-8 text-center shadow-lg animate-fade-in mb-6 ${
          allCorrect ? "border-2 border-green-200" : isLocked ? "border-2 border-red-200" : ""
        }`}>
          <p className="text-5xl mb-4">{allCorrect ? "🎉" : isLocked ? "🔒" : "✅"}</p>
          <h2 className="text-xl font-bold mb-2" style={{ color: allCorrect ? "#15803d" : isLocked ? "#b91c1c" : "#15803d" }}>
            {allCorrect ? "Alles richtig!" : isLocked ? "Gesperrt — Keine Versuche mehr" : "Abgegeben"}
          </h2>
          <div className="flex justify-center gap-4 mt-3 text-sm">
            {correctCount > 0 && (
              <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-semibold">
                ✅ {correctCount} richtig
              </span>
            )}
            {wrongCount > 0 && (
              <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full font-semibold">
                ❌ {wrongCount} falsch
              </span>
            )}
            {pendingCount > 0 && (
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-semibold">
                📝 {pendingCount} wird geprüft
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {attemptsUsed} von {MAX_ATTEMPTS} Versuchen gebraucht
            {submission?.submitted_at && ` · Abgegeben am ${new Date(submission.submitted_at).toLocaleDateString("de-DE")}`}
          </p>
        </div>

        {/* Einzelne Aufgaben mit Ergebnis */}
        <div className="grid gap-4">
          {(items ?? []).map((item, idx) => {
            const answer = existingAnswers.find((a) => a.item_id === item.id);
            const isCorrect = answer?.is_correct;

            return (
              <div
                key={item.id}
                className={`glass-card rounded-2xl p-5 shadow-sm animate-fade-in ${
                  isCorrect === true ? "border-2 border-green-200" :
                  isCorrect === false ? "border-2 border-red-200" : ""
                }`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-slate-400 font-semibold">Aufgabe {idx + 1}</p>
                  {isCorrect === true && <span className="text-xs font-bold text-green-600">✅ Richtig</span>}
                  {isCorrect === false && <span className="text-xs font-bold text-red-600">❌ Falsch</span>}
                  {isCorrect === null && <span className="text-xs font-bold text-blue-600">📝 Wird geprüft</span>}
                </div>
                <p className="text-sm font-semibold text-slate-800 mb-3">{item.question}</p>

                {item.item_type === "choice" && (
                  <div className="grid gap-1.5">
                    {((item.options as string[]) ?? []).map((opt, optIdx) => {
                      const wasSelected = answer?.selected_options?.includes(optIdx);
                      return (
                        <div
                          key={optIdx}
                          className={`px-3 py-2 rounded-lg text-sm ${
                            wasSelected
                              ? isCorrect === true ? "bg-green-50 text-green-800 font-medium" :
                                isCorrect === false ? "bg-red-50 text-red-800 font-medium" :
                                "bg-orange-50 text-orange-800 font-medium"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          <span className="font-bold mr-2">{String.fromCharCode(65 + optIdx)}</span>
                          {opt}
                          {wasSelected && " ← deine Antwort"}
                        </div>
                      );
                    })}
                  </div>
                )}

                {item.item_type === "text" && answer?.text_answer && (
                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                    {answer.text_answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Link
          href="/kind/aufgaben"
          className="block mt-6 text-center text-sm text-slate-500 hover:text-slate-700 underline"
        >
          ← Zurück zu allen Aufgaben
        </Link>
      </div>
    );
  }

  // Aufgabe noch offen — Solver anzeigen
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-extrabold text-slate-800">{assignment.title}</h1>
        {assignment.description && (
          <p className="text-base text-slate-500 mt-1">{assignment.description}</p>
        )}
        <p className="text-sm text-slate-400 mt-2">
          Fällig bis: {dueDate.toLocaleDateString("de-DE")}
        </p>
      </div>

      <AssignmentSolver
        assignmentId={assignment.id}
        items={(items ?? []).map((item) => ({
          id: item.id,
          type: item.item_type as "text" | "choice",
          question: item.question,
          options: (item.options as string[]) ?? [],
        }))}
        existingAnswers={existingAnswers}
        initialAttempts={attemptsUsed}
        maxAttempts={MAX_ATTEMPTS}
      />
    </div>
  );
}
