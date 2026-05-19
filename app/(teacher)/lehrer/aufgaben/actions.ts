"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/teacher/auth";
import {
  createAssignmentSchema,
  gradeSubmissionSchema,
  type CreateAssignmentInput,
  type GradeSubmissionInput,
} from "@/lib/schemas/assignment";

export async function createAssignmentAction(
  input: CreateAssignmentInput
): Promise<{ error: string | null }> {
  // A3 — Rollen-Pruefung: nur angemeldete Lehrkraefte duerfen Aufgaben erstellen.
  const auth = await requireTeacher();
  if (!auth.ok) return { error: auth.error };
  const { userId } = auth;

  // A2 — Server-seitige Validierung: gesamten Input per Zod pruefen
  // (Titel, Beschreibung, dueDate, Items inkl. Choice-Konsistenz).
  const parsed = createAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.",
    };
  }
  const data = parsed.data;

  const admin = createAdminClient();

  // A1 — Klassen-Eigentum pruefen: alle classIds muessen dem Lehrer gehoeren.
  // Verhindert das Zuweisen von Aufgaben an fremde Klassen.
  const { data: ownedClasses, error: ownedError } = await admin
    .from("classes")
    .select("id")
    .eq("teacher_id", userId)
    .in("id", data.classIds);

  if (ownedError) {
    return { error: "Klassen konnten nicht geprueft werden." };
  }

  const ownedIds = new Set((ownedClasses ?? []).map((c) => c.id));
  const allOwned = data.classIds.every((id) => ownedIds.has(id));
  if (!allOwned || ownedIds.size !== new Set(data.classIds).size) {
    return {
      error: "Mindestens eine der gewaehlten Klassen gehoert nicht zu Ihnen.",
    };
  }

  // 1. Aufgabe erstellen
  const { data: assignment, error: assignmentError } = await admin
    .from("assignments")
    .insert({
      teacher_id: userId,
      title: data.title,
      description: data.description,
      due_date: data.dueDate,
    })
    .select("id")
    .single();

  if (assignmentError || !assignment) {
    return { error: "Aufgabe konnte nicht erstellt werden." };
  }

  // 2. Items erstellen
  const itemRows = data.items.map((item) => ({
    assignment_id: assignment.id,
    sort_order: item.sortOrder,
    item_type: item.itemType,
    question: item.question,
    options: item.itemType === "choice" ? item.options : null,
    correct_options: item.itemType === "choice" ? item.correctOptions : null,
    // 'math': die generierte korrekte Zahl; bei 'text'/'choice' null.
    correct_number: item.itemType === "math" ? item.correctNumber : null,
  }));

  const { error: itemsError } = await admin
    .from("assignment_items")
    .insert(itemRows);

  if (itemsError) {
    // Rollback
    await admin.from("assignments").delete().eq("id", assignment.id);
    return { error: "Aufgaben-Items konnten nicht erstellt werden." };
  }

  // 3. Klassen zuweisen (nur gepruefte, eigene Klassen)
  const classRows = data.classIds.map((classId) => ({
    assignment_id: assignment.id,
    class_id: classId,
  }));

  const { error: classError } = await admin
    .from("assignment_classes")
    .insert(classRows);

  if (classError) {
    await admin.from("assignments").delete().eq("id", assignment.id);
    return { error: "Klassen-Zuweisung fehlgeschlagen." };
  }

  revalidatePath("/lehrer/aufgaben");
  revalidatePath("/lehrer/dashboard");
  return { error: null };
}

/**
 * Korrigiert eine abgegebene Schueler-Abgabe.
 *
 * Schreibt pro Antwort `is_correct` + `teacher_comment` und auf der Abgabe
 * selbst `teacher_feedback` + `graded_at`. Sicherheits-Pruefungen:
 *   - requireTeacher() (Audit A3)
 *   - Ownership: assignment.teacher_id muss dem aufrufenden Lehrer gehoeren
 *     (ueber Submission -> assignment-Join)
 *   - nur Abgaben mit status === 'submitted' duerfen bewertet werden
 *   - alle uebergebenen answerIds muessen tatsaechlich zu dieser Submission
 *     gehoeren (verhindert das Faelschen fremder Antworten)
 */
export async function gradeSubmissionAction(
  input: GradeSubmissionInput
): Promise<{ error: string | null }> {
  const auth = await requireTeacher();
  if (!auth.ok) return { error: auth.error };
  const { userId } = auth;

  const parsed = gradeSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.",
    };
  }
  const data = parsed.data;

  const admin = createAdminClient();

  // Submission inkl. Aufgabe laden -> Ownership + Status pruefen.
  const { data: submission, error: subError } = await admin
    .from("assignment_submissions")
    .select("id, status, assignment_id, assignments(teacher_id)")
    .eq("id", data.submissionId)
    .maybeSingle();

  if (subError) {
    return { error: "Abgabe konnte nicht geladen werden." };
  }
  if (!submission) {
    return { error: "Abgabe nicht gefunden." };
  }

  const ownerTeacherId = (
    submission.assignments as { teacher_id: string } | null
  )?.teacher_id;
  if (ownerTeacherId !== userId) {
    return { error: "Diese Abgabe gehoert nicht zu Ihren Aufgaben." };
  }

  if (submission.status !== "submitted") {
    return { error: "Nur abgegebene Aufgaben koennen korrigiert werden." };
  }

  // Alle Antworten dieser Submission laden -> uebergebene answerIds pruefen.
  const { data: ownAnswers, error: ansError } = await admin
    .from("submission_answers")
    .select("id")
    .eq("submission_id", data.submissionId);

  if (ansError) {
    return { error: "Antworten konnten nicht geprueft werden." };
  }

  const ownAnswerIds = new Set((ownAnswers ?? []).map((a) => a.id));
  const allBelong = data.answers.every((a) => ownAnswerIds.has(a.answerId));
  if (!allBelong) {
    return { error: "Mindestens eine Antwort gehoert nicht zu dieser Abgabe." };
  }

  // Pro Antwort is_correct + teacher_comment schreiben.
  for (const answer of data.answers) {
    const { error: updateError } = await admin
      .from("submission_answers")
      .update({
        is_correct: answer.isCorrect,
        teacher_comment: answer.teacherComment ?? null,
      })
      .eq("id", answer.answerId)
      .eq("submission_id", data.submissionId);

    if (updateError) {
      return { error: "Bewertung konnte nicht gespeichert werden." };
    }
  }

  // Gesamt-Feedback + Korrektur-Zeitstempel auf der Abgabe setzen.
  const { error: gradeError } = await admin
    .from("assignment_submissions")
    .update({
      teacher_feedback: data.teacherFeedback ?? null,
      graded_at: new Date().toISOString(),
    })
    .eq("id", data.submissionId);

  if (gradeError) {
    return { error: "Korrektur konnte nicht abgeschlossen werden." };
  }

  revalidatePath(`/lehrer/aufgaben/${submission.assignment_id}`);
  revalidatePath("/lehrer/aufgaben");
  revalidatePath("/lehrer/dashboard");
  return { error: null };
}
