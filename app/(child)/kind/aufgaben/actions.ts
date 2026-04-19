"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_ATTEMPTS = 3;

type AnswerInput = { itemId: string; textAnswer?: string; selectedOptions?: number[] };
type AnswerResult = { itemId: string; isCorrect: boolean | null };

export async function submitAssignmentAction(
  assignmentId: string,
  answers: AnswerInput[]
): Promise<{ error: string | null; results?: AnswerResult[]; attemptsUsed?: number; locked?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const admin = createAdminClient();

  // Bestehende Abgabe prüfen
  const { data: existing } = await admin
    .from("assignment_submissions")
    .select("id, status, started_at, attempts_used")
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  const currentAttempts = (existing as { attempts_used?: number } | null)?.attempts_used ?? 0;

  // Gesperrt wenn max Versuche erreicht oder bereits endgültig abgegeben
  if (currentAttempts >= MAX_ATTEMPTS) {
    return { error: "Du hast alle 3 Versuche aufgebraucht.", locked: true, attemptsUsed: currentAttempts };
  }
  if (existing?.status === "submitted") {
    return { error: "Du hast diese Aufgabe bereits abgegeben.", locked: true, attemptsUsed: currentAttempts };
  }

  // Korrekte Antworten für alle Items laden
  const { data: items } = await admin
    .from("assignment_items")
    .select("id, item_type, correct_options")
    .eq("assignment_id", assignmentId);

  const correctMap = new Map<string, { type: string; correctOptions: number[] | null }>();
  for (const item of items ?? []) {
    correctMap.set(item.id, {
      type: item.item_type,
      correctOptions: item.correct_options as number[] | null,
    });
  }

  // Antworten bewerten
  const results: AnswerResult[] = [];
  let allCorrect = true;

  for (const ans of answers) {
    const itemInfo = correctMap.get(ans.itemId);
    let isCorrect: boolean | null = null;

    if (itemInfo) {
      if (itemInfo.type === "choice" && itemInfo.correctOptions) {
        // Multiple Choice: prüfe ob gewählte Optionen exakt mit korrekten übereinstimmen
        const selected = [...(ans.selectedOptions ?? [])].sort();
        const correct = [...itemInfo.correctOptions].sort();
        isCorrect = selected.length === correct.length &&
          selected.every((v, i) => v === correct[i]);
      } else if (itemInfo.type === "text") {
        // Freitext: Lehrer bewertet manuell → null (nicht automatisch bewertbar)
        isCorrect = null;
      }
    }

    if (isCorrect === false) allCorrect = false;
    results.push({ itemId: ans.itemId, isCorrect });
  }

  const newAttempts = currentAttempts + 1;
  const isLocked = newAttempts >= MAX_ATTEMPTS;
  // Endgültig abgegeben wenn: alles richtig ODER max Versuche erreicht
  const finalSubmit = allCorrect || isLocked;

  let submissionId: string;

  if (existing) {
    const startedAt = new Date(existing.started_at);
    const durationSeconds = Math.round((Date.now() - startedAt.getTime()) / 1000);

    const { error } = await admin
      .from("assignment_submissions")
      .update({
        status: finalSubmit ? "submitted" : "in_progress",
        submitted_at: finalSubmit ? new Date().toISOString() : null,
        duration_seconds: durationSeconds,
        attempts_used: newAttempts,
      })
      .eq("id", existing.id);
    if (error) return { error: "Abgabe fehlgeschlagen." };
    submissionId = existing.id;

    // Alte Antworten löschen
    await admin.from("submission_answers").delete().eq("submission_id", existing.id);
  } else {
    const { data: sub, error } = await admin
      .from("assignment_submissions")
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        status: finalSubmit ? "submitted" : "in_progress",
        submitted_at: finalSubmit ? new Date().toISOString() : null,
        duration_seconds: 0,
        attempts_used: newAttempts,
      })
      .select("id")
      .single();
    if (error || !sub) return { error: "Abgabe konnte nicht erstellt werden." };
    submissionId = sub.id;
  }

  // Antworten mit Korrektheit speichern
  const answerRows = answers.map((a) => {
    const result = results.find((r) => r.itemId === a.itemId);
    return {
      submission_id: submissionId,
      item_id: a.itemId,
      text_answer: a.textAnswer ?? null,
      selected_options: a.selectedOptions ?? null,
      is_correct: result?.isCorrect ?? null,
    };
  });

  if (answerRows.length > 0) {
    await admin.from("submission_answers").insert(answerRows);
  }

  revalidatePath("/kind/aufgaben");
  return { error: null, results, attemptsUsed: newAttempts, locked: isLocked };
}

export async function startAssignmentAction(
  assignmentId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("assignment_submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!existing) {
    await admin.from("assignment_submissions").insert({
      assignment_id: assignmentId,
      student_id: user.id,
      status: "in_progress",
      attempts_used: 0,
    });
  }

  return { error: null };
}
