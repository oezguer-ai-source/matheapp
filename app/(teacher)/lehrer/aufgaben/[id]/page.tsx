import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatName } from "@/lib/teacher/format";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min > 0 ? `${min} Min ${sec} Sek` : `${sec} Sek`;
}

export default async function AufgabeDetailPage({
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

  // Aufgabe laden
  const admin = createAdminClient();
  const { data: assignment } = await admin
    .from("assignments")
    .select("id, title, description, due_date, created_at")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!assignment) notFound();

  // Items laden
  const { data: items } = await admin
    .from("assignment_items")
    .select("id, sort_order, item_type, question, options, correct_options")
    .eq("assignment_id", id)
    .order("sort_order");

  // Zugewiesene Klassen laden
  const { data: assignedClasses } = await admin
    .from("assignment_classes")
    .select("class_id, classes(name)")
    .eq("assignment_id", id);

  // Alle Schüler der zugewiesenen Klassen laden
  const classIds = assignedClasses?.map((ac) => ac.class_id) ?? [];
  let allStudents: { user_id: string; display_name: string; class_id: string | null }[] = [];
  if (classIds.length > 0) {
    const { data: students } = await admin
      .from("profiles")
      .select("user_id, display_name, class_id")
      .eq("role", "child")
      .in("class_id", classIds)
      .order("display_name");
    allStudents = students ?? [];
  }

  // Abgaben laden
  const { data: submissions } = await admin
    .from("assignment_submissions")
    .select("id, student_id, status, started_at, submitted_at, duration_seconds")
    .eq("assignment_id", id);

  const submissionByStudent = new Map(
    (submissions ?? []).map((s) => [s.student_id, s])
  );

  // Antworten aller Abgaben in einer Query laden (kein N+1)
  const submissionIds = (submissions ?? []).map((s) => s.id);
  let answers: {
    submission_id: string;
    item_id: string;
    selected_options: number[] | null;
    text_answer: string | null;
  }[] = [];
  if (submissionIds.length > 0) {
    const { data } = await admin
      .from("submission_answers")
      .select("submission_id, item_id, selected_options, text_answer")
      .in("submission_id", submissionIds);
    answers = (data ?? []).map((a) => ({
      submission_id: a.submission_id,
      item_id: a.item_id,
      selected_options: a.selected_options as number[] | null,
      text_answer: a.text_answer,
    }));
  }

  // Antworten nach submission_id gruppieren -> Map<itemId, answer>
  const answersBySubmission = new Map<string, Map<string, (typeof answers)[number]>>();
  for (const ans of answers) {
    let inner = answersBySubmission.get(ans.submission_id);
    if (!inner) {
      inner = new Map();
      answersBySubmission.set(ans.submission_id, inner);
    }
    inner.set(ans.item_id, ans);
  }

  // Items als Map fuer schnellen Zugriff bei der Auswertung
  const itemList = items ?? [];
  const choiceItemCount = itemList.filter((it) => it.item_type === "choice").length;

  /**
   * Bewertet eine MC-Antwort live: selected_options muss exakt der Menge
   * correct_options entsprechen. Keine Persistenz noetig - der Lehrer-View
   * ist read-only, eine berechnete Anzeige ist robuster und vermeidet
   * Admin-Schreibzugriffe bei jedem Seitenaufruf.
   */
  function isChoiceCorrect(
    correct: number[] | null | undefined,
    selected: number[] | null | undefined
  ): boolean {
    const c = [...(correct ?? [])].sort((a, b) => a - b);
    const s = [...(selected ?? [])].sort((a, b) => a - b);
    if (c.length !== s.length || c.length === 0) return false;
    return c.every((v, i) => v === s[i]);
  }

  const dueDate = new Date(assignment.due_date);
  const isOverdue = dueDate < new Date();

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {assignment.title}
        </h1>
        {assignment.description && (
          <p className="text-base text-slate-600 mt-1">{assignment.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3">
          <span
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              isOverdue
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-600"
            }`}
          >
            Fällig: {dueDate.toLocaleDateString("de-DE")}
          </span>
          <span className="text-sm text-slate-500">
            Klassen:{" "}
            {assignedClasses
              ?.map((ac) => (ac.classes as { name: string })?.name)
              .join(", ")}
          </span>
        </div>
      </div>

      {/* Aufgaben-Items */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Aufgaben ({items?.length ?? 0})
        </h2>
        <div className="grid gap-2">
          {items?.map((item, idx) => (
            <Card key={item.id}>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-slate-500 mb-1">
                  {idx + 1}. {item.item_type === "text" ? "Freitext" : "Multiple Choice"}
                </p>
                <p className="text-sm font-medium text-slate-900">{item.question}</p>
                {item.item_type === "choice" && item.options && (
                  <ul className="mt-2 space-y-1">
                    {(item.options as string[]).map((opt, optIdx) => (
                      <li
                        key={optIdx}
                        className={`text-sm px-2 py-1 rounded ${
                          (item.correct_options as number[])?.includes(optIdx)
                            ? "bg-green-50 text-green-700 font-medium"
                            : "text-slate-600"
                        }`}
                      >
                        {opt}
                        {(item.correct_options as number[])?.includes(optIdx) && " ✓"}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Schüler-Fortschritt */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Schüler-Fortschritt ({allStudents.length} Schüler)
        </h2>

        {allStudents.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">
                Keine Schüler in den zugewiesenen Klassen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {allStudents.map((student) => {
              const sub = submissionByStudent.get(student.user_id);
              const statusLabel = !sub
                ? "Nicht begonnen"
                : sub.status === "submitted"
                  ? "Abgegeben"
                  : "In Bearbeitung";
              const statusColor = !sub
                ? "bg-slate-100 text-slate-500"
                : sub.status === "submitted"
                  ? "bg-green-50 text-green-600"
                  : "bg-amber-50 text-amber-600";

              const studentName = formatName(student.display_name);

              const itemAnswers = sub
                ? answersBySubmission.get(sub.id) ?? new Map()
                : new Map();

              // MC-Quote berechnen
              let choiceCorrect = 0;
              for (const item of itemList) {
                if (item.item_type !== "choice") continue;
                const ans = itemAnswers.get(item.id);
                if (
                  ans &&
                  isChoiceCorrect(
                    item.correct_options as number[] | null,
                    ans.selected_options
                  )
                ) {
                  choiceCorrect += 1;
                }
              }

              const hasAnswers = itemAnswers.size > 0;

              return (
                <Card key={student.user_id}>
                  <CardContent className="pt-4 pb-4">
                    {/* Kopfzeile pro Schüler */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-slate-900 mr-auto">
                        {studentName}
                      </span>
                      {choiceItemCount > 0 && hasAnswers && (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                          {choiceCorrect}/{choiceItemCount} richtig (MC)
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {formatDuration(sub?.duration_seconds ?? null)}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {/* Auswertung pro Item */}
                    {hasAnswers && (
                      <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        {itemList.map((item, idx) => {
                          const ans = itemAnswers.get(item.id);

                          if (!ans) {
                            return (
                              <li
                                key={item.id}
                                className="text-sm text-slate-400"
                              >
                                {idx + 1}. {item.question} — keine Antwort
                              </li>
                            );
                          }

                          if (item.item_type === "choice") {
                            const correct = isChoiceCorrect(
                              item.correct_options as number[] | null,
                              ans.selected_options
                            );
                            const opts = (item.options as string[] | null) ?? [];
                            const selectedLabels = (ans.selected_options ?? [])
                              .map((o: number) => opts[o])
                              .filter(Boolean)
                              .join(", ");
                            return (
                              <li key={item.id} className="text-sm">
                                <span className="text-slate-500">
                                  {idx + 1}.{" "}
                                </span>
                                <span className="text-slate-900">
                                  {item.question}
                                </span>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <span
                                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                      correct
                                        ? "bg-green-50 text-green-700"
                                        : "bg-red-50 text-red-600"
                                    }`}
                                  >
                                    {correct ? "✓ richtig" : "✗ falsch"}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    Antwort:{" "}
                                    {selectedLabels || "keine Auswahl"}
                                  </span>
                                </div>
                              </li>
                            );
                          }

                          // Freitext — manuelle Sichtung durch Lehrer
                          return (
                            <li key={item.id} className="text-sm">
                              <span className="text-slate-500">
                                {idx + 1}.{" "}
                              </span>
                              <span className="text-slate-900">
                                {item.question}
                              </span>
                              <div className="mt-1 rounded-md bg-slate-50 border border-slate-100 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">
                                {ans.text_answer?.trim() || (
                                  <span className="text-slate-400">
                                    keine Antwort
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {sub && !hasAnswers && (
                      <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-400">
                        Noch keine Antworten erfasst.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
