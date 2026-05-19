import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatName } from "@/lib/teacher/format";
import {
  SubmissionGrader,
  type GraderItem,
} from "@/components/teacher/submission-grader";

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

  // Aufgabe laden (Ownership ueber teacher_id)
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
    .select(
      "id, sort_order, item_type, question, options, correct_options, correct_number"
    )
    .eq("assignment_id", id)
    .order("sort_order");
  const itemList = items ?? [];

  // Zugewiesene Klassen laden
  const { data: assignedClasses } = await admin
    .from("assignment_classes")
    .select("class_id, classes(name)")
    .eq("assignment_id", id);

  // Alle Schüler der zugewiesenen Klassen laden
  const classIds = assignedClasses?.map((ac) => ac.class_id) ?? [];
  let allStudents: { user_id: string; display_name: string }[] = [];
  if (classIds.length > 0) {
    const { data: students } = await admin
      .from("profiles")
      .select("user_id, display_name")
      .eq("role", "child")
      .in("class_id", classIds)
      .order("display_name");
    allStudents = students ?? [];
  }

  // Abgaben laden — inkl. Korrektur-Felder
  const { data: submissions } = await admin
    .from("assignment_submissions")
    .select(
      "id, student_id, status, submitted_at, teacher_feedback, graded_at"
    )
    .eq("assignment_id", id);

  const submissionByStudent = new Map(
    (submissions ?? []).map((s) => [s.student_id, s])
  );

  // Antworten aller Abgaben in einer Query laden (kein N+1) — inkl.
  // answer-id, is_correct und teacher_comment fuer die Korrektur.
  const submissionIds = (submissions ?? []).map((s) => s.id);
  type AnswerRow = {
    id: string;
    submission_id: string;
    item_id: string;
    selected_options: number[] | null;
    text_answer: string | null;
    is_correct: boolean | null;
    teacher_comment: string | null;
  };
  let answers: AnswerRow[] = [];
  if (submissionIds.length > 0) {
    const { data } = await admin
      .from("submission_answers")
      .select(
        "id, submission_id, item_id, selected_options, text_answer, is_correct, teacher_comment"
      )
      .in("submission_id", submissionIds);
    answers = (data ?? []).map((a) => ({
      id: a.id,
      submission_id: a.submission_id,
      item_id: a.item_id,
      selected_options: a.selected_options as number[] | null,
      text_answer: a.text_answer,
      is_correct: a.is_correct,
      teacher_comment: a.teacher_comment,
    }));
  }

  // Antworten nach submission_id -> Map<itemId, answer>
  const answersBySubmission = new Map<string, Map<string, AnswerRow>>();
  for (const ans of answers) {
    let inner = answersBySubmission.get(ans.submission_id);
    if (!inner) {
      inner = new Map();
      answersBySubmission.set(ans.submission_id, inner);
    }
    inner.set(ans.item_id, ans);
  }

  const dueDate = new Date(assignment.due_date);
  const isOverdue = dueDate < new Date();

  // Schüler nach Abgabe-Status sortieren: abgegebene zuerst.
  const submittedStudents = allStudents.filter((s) => {
    const sub = submissionByStudent.get(s.user_id);
    return sub?.status === "submitted";
  });
  const otherStudents = allStudents.filter((s) => {
    const sub = submissionByStudent.get(s.user_id);
    return sub?.status !== "submitted";
  });

  const correctedCount = submittedStudents.filter((s) => {
    const sub = submissionByStudent.get(s.user_id);
    return sub?.graded_at != null;
  }).length;

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {assignment.title}
        </h1>
        {assignment.description && (
          <p className="text-base text-slate-600 mt-1">
            {assignment.description}
          </p>
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

      {/* Aufgaben-Items (Übersicht) */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Aufgaben ({itemList.length})
        </h2>
        <div className="grid gap-2">
          {itemList.map((item, idx) => (
            <Card key={item.id}>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-slate-500 mb-1">
                  {idx + 1}.{" "}
                  {item.item_type === "text"
                    ? "Freitext"
                    : item.item_type === "choice"
                      ? "Multiple Choice"
                      : item.item_type === "math"
                        ? "Mathe-Aufgabe"
                        : "Aufgabe"}
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {item.question}
                </p>
                {item.item_type === "math" && (
                  <p className="mt-1 text-xs text-slate-500">
                    Korrekte Zahl:{" "}
                    <span className="font-semibold text-green-700">
                      {item.correct_number ?? "—"}
                    </span>
                  </p>
                )}
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
                        {(item.correct_options as number[])?.includes(
                          optIdx
                        ) && " ✓"}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Abgaben-Korrektur */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Abgaben korrigieren
          </h2>
          {submittedStudents.length > 0 && (
            <span className="text-sm text-slate-500">
              {correctedCount}/{submittedStudents.length} korrigiert
            </span>
          )}
        </div>

        {submittedStudents.length === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-6">
              <p className="text-sm text-slate-500">
                {allStudents.length === 0
                  ? "Keine Schüler in den zugewiesenen Klassen."
                  : "Noch keine Abgaben vorhanden."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {submittedStudents.map((student) => {
              const sub = submissionByStudent.get(student.user_id);
              if (!sub) return null;
              const itemAnswers =
                answersBySubmission.get(sub.id) ?? new Map<string, AnswerRow>();

              const graderItems: GraderItem[] = itemList.map((item) => {
                const ans = itemAnswers.get(item.id);
                return {
                  itemId: item.id,
                  answerId: ans?.id ?? null,
                  itemType: item.item_type,
                  question: item.question,
                  options: (item.options as string[] | null) ?? null,
                  correctOptions:
                    (item.correct_options as number[] | null) ?? null,
                  correctNumber:
                    (item.correct_number as number | null) ?? null,
                  selectedOptions: ans?.selected_options ?? null,
                  textAnswer: ans?.text_answer ?? null,
                  isCorrect: ans?.is_correct ?? null,
                  teacherComment: ans?.teacher_comment ?? null,
                };
              });

              return (
                <SubmissionGrader
                  key={student.user_id}
                  submissionId={sub.id}
                  studentName={formatName(student.display_name)}
                  gradedAt={sub.graded_at}
                  teacherFeedback={sub.teacher_feedback}
                  items={graderItems}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Schüler ohne Abgabe */}
      {otherStudents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Noch keine Abgabe ({otherStudents.length})
          </h2>
          <div className="space-y-2">
            {otherStudents.map((student) => {
              const sub = submissionByStudent.get(student.user_id);
              const statusLabel = !sub
                ? "Nicht begonnen"
                : "In Bearbeitung";
              const statusColor = !sub
                ? "bg-slate-100 text-slate-500"
                : "bg-amber-50 text-amber-600";
              return (
                <Card key={student.user_id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-900 mr-auto">
                        {formatName(student.display_name)}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
