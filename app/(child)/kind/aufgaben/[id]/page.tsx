import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AssignmentSolver } from "@/components/child/assignment-solver";
import { ChildCard } from "@/components/ui/child-card";

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

  // RLS-gebundener Client: Die Policies auf assignments/assignment_items
  // begrenzen die Sichtbarkeit bereits auf Aufgaben der eigenen Klasse.
  // Aufgabe laden
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, description, due_date")
    .eq("id", id)
    .maybeSingle();

  if (!assignment) notFound();

  // Items laden (ohne correct_options — die sieht der Schüler nicht)
  const { data: items } = await supabase
    .from("assignment_items")
    .select("id, sort_order, item_type, question, options")
    .eq("assignment_id", id)
    .order("sort_order");

  // Abgabe-Status laden
  const { data: submission } = await supabase
    .from("assignment_submissions")
    .select("id, status, submitted_at, duration_seconds, attempts_used, teacher_feedback, graded_at")
    .eq("assignment_id", id)
    .eq("student_id", user.id)
    .maybeSingle();

  const attemptsUsed = (submission as { attempts_used?: number } | null)?.attempts_used ?? 0;
  const isSubmitted = submission?.status === "submitted";
  const isLocked = attemptsUsed >= MAX_ATTEMPTS;
  const teacherFeedback = (submission as { teacher_feedback?: string | null } | null)?.teacher_feedback ?? null;
  const gradedAt = (submission as { graded_at?: string | null } | null)?.graded_at ?? null;
  // Lehrer hat die Abgabe korrigiert?
  const isGraded = gradedAt != null;

  // Bestehende Antworten + Korrektheit + Lehrer-Kommentar laden
  let existingAnswers: {
    item_id: string;
    text_answer: string | null;
    selected_options: number[] | null;
    is_correct: boolean | null;
    teacher_comment: string | null;
  }[] = [];
  if (submission) {
    const { data: answers } = await supabase
      .from("submission_answers")
      .select("item_id, text_answer, selected_options, is_correct, teacher_comment")
      .eq("submission_id", submission.id);
    existingAnswers = (answers ?? []).map((a) => ({
      item_id: a.item_id,
      text_answer: a.text_answer,
      selected_options: a.selected_options as number[] | null,
      is_correct: a.is_correct as boolean | null,
      teacher_comment: a.teacher_comment as string | null,
    }));
  }

  const dueDate = new Date(assignment.due_date);

  // Anzeige wenn abgegeben oder gesperrt
  if (isSubmitted || isLocked) {
    // Lehrer-Bewertung erst nach Korrektur (graded_at) anzeigen.
    const correctCount = isGraded ? existingAnswers.filter((a) => a.is_correct === true).length : 0;
    const wrongCount = isGraded ? existingAnswers.filter((a) => a.is_correct === false).length : 0;
    // "Alles richtig" nur, wenn der Lehrer korrigiert hat und nichts falsch ist.
    const allCorrect = isGraded && wrongCount === 0 && correctCount > 0;

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-extrabold text-slate-800">{assignment.title}</h1>
          <p className="text-sm text-slate-400 mt-2">
            Fällig bis: {dueDate.toLocaleDateString("de-DE")}
          </p>
        </div>

        {/* Ergebnis-Übersicht */}
        {isGraded ? (
          <ChildCard
            padding="xl"
            elevation="lg"
            className={`text-center mb-6 border-2 ${
              allCorrect ? "border-green-200" : "border-amber-200"
            }`}
          >
            <p className="text-6xl mb-4">{allCorrect ? "🎉" : "🌟"}</p>
            <h2
              className="text-2xl font-extrabold mb-2"
              style={{ color: allCorrect ? "#15803d" : "#b45309" }}
            >
              {allCorrect
                ? "Alles richtig — super gemacht!"
                : "Tolle Arbeit — schau dir dein Ergebnis an!"}
            </h2>
            <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm">
              {correctCount > 0 && (
                <span className="bg-green-50 text-green-700 px-4 py-1.5 rounded-full font-bold">
                  ✅ {correctCount} richtig
                </span>
              )}
              {wrongCount > 0 && (
                <span className="bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full font-bold">
                  💪 {wrongCount} zum Üben
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Korrigiert am {new Date(gradedAt!).toLocaleDateString("de-DE")}
            </p>
          </ChildCard>
        ) : (
          <ChildCard
            padding="xl"
            elevation="lg"
            className="text-center mb-6 border-2 border-blue-200"
          >
            <p className="text-6xl mb-4">⏳</p>
            <h2 className="text-2xl font-extrabold mb-2 text-blue-700">
              Dein Lehrer schaut sich das noch an
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Du hast deine Aufgabe abgegeben. Sobald dein Lehrer sie
              korrigiert hat, siehst du hier dein Ergebnis.
            </p>
            <p className="text-xs text-slate-400 mt-4">
              {attemptsUsed} von {MAX_ATTEMPTS} Versuchen gebraucht
              {submission?.submitted_at &&
                ` · Abgegeben am ${new Date(submission.submitted_at).toLocaleDateString("de-DE")}`}
            </p>
          </ChildCard>
        )}

        {/* Gesamt-Feedback des Lehrers (oben, gut sichtbar) */}
        {isGraded && teacherFeedback && (
          <ChildCard
            elevation="md"
            className="mb-6 border-2 border-purple-200 bg-purple-50/40"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-2xl">
                💬
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-purple-500 uppercase tracking-wide mb-1">
                  Nachricht von deinem Lehrer
                </p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {teacherFeedback}
                </p>
              </div>
            </div>
          </ChildCard>
        )}

        {/* Einzelne Aufgaben mit Ergebnis */}
        <div className="grid gap-4">
          {(items ?? []).map((item, idx) => {
            const answer = existingAnswers.find((a) => a.item_id === item.id);
            // Bewertung nur nach Lehrer-Korrektur.
            const isCorrect = isGraded ? answer?.is_correct ?? null : null;
            const comment = isGraded ? answer?.teacher_comment ?? null : null;

            return (
              <ChildCard
                key={item.id}
                elevation="sm"
                className={
                  isGraded && isCorrect === true
                    ? "border-2 border-green-200"
                    : isGraded && isCorrect === false
                      ? "border-2 border-amber-200"
                      : ""
                }
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-slate-400 font-semibold">Aufgabe {idx + 1}</p>
                  {!isGraded && (
                    <span className="text-xs font-bold text-blue-600">📝 Abgegeben</span>
                  )}
                  {isGraded && isCorrect === true && (
                    <span className="text-xs font-bold text-green-600">✅ Richtig</span>
                  )}
                  {isGraded && isCorrect === false && (
                    <span className="text-xs font-bold text-amber-600">❌ Üb das nochmal</span>
                  )}
                  {isGraded && isCorrect === null && (
                    <span className="text-xs font-bold text-slate-500">— Angeschaut</span>
                  )}
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
                              ? isGraded && isCorrect === true ? "bg-green-50 text-green-800 font-medium" :
                                isGraded && isCorrect === false ? "bg-amber-50 text-amber-800 font-medium" :
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

                {item.item_type === "text" && (
                  answer?.text_answer ? (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                      {answer.text_answer}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-400 italic">
                      Keine Antwort abgegeben
                    </div>
                  )
                )}

                {item.item_type === "math" && (
                  answer?.text_answer ? (
                    <div
                      className={`rounded-lg p-3 text-sm font-semibold ${
                        isGraded && isCorrect === true
                          ? "bg-green-50 text-green-800"
                          : isGraded && isCorrect === false
                            ? "bg-amber-50 text-amber-800"
                            : "bg-cyan-50 text-cyan-800"
                      }`}
                    >
                      Deine Antwort: {answer.text_answer}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-400 italic">
                      Keine Antwort abgegeben
                    </div>
                  )
                )}

                {/* Kommentar des Lehrers zu dieser Antwort */}
                {comment && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-purple-50/70 border border-purple-100 px-3 py-2.5">
                    <span className="text-base">💬</span>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {comment}
                    </p>
                  </div>
                )}
              </ChildCard>
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
          type: item.item_type as "text" | "choice" | "math",
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
