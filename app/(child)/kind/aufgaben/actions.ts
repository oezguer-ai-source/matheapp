"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submissionAnswerSchema } from "@/lib/schemas/assignment";

const MAX_ATTEMPTS = 3;

type AnswerInput = { itemId: string; textAnswer?: string; selectedOptions?: number[] };
type AnswerResult = { itemId: string; isCorrect: boolean | null };

// E3 — Eingangsvalidierung: das `answers`-Array wird mit dem geteilten
// Zod-Schema geprueft. Leere (unbeantwortete) Items werden vorher entfernt,
// damit eine Teil-Abgabe weiterhin moeglich ist; der refine() von
// submissionAnswerSchema wuerde sie sonst ablehnen.
const answersInputSchema = z.array(submissionAnswerSchema);

/**
 * E3 — Prueft, ob die Aufgabe ueberhaupt der Klasse des Kindes zugewiesen ist.
 * Muss VOR jedem Admin-Client-Zugriff laufen, da der Admin-Client RLS umgeht.
 */
async function assignmentBelongsToChildClass(
  supabase: Awaited<ReturnType<typeof createClient>>,
  admin: ReturnType<typeof createAdminClient>,
  assignmentId: string,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("class_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile?.class_id) return false;

  const { data: link } = await admin
    .from("assignment_classes")
    .select("assignment_id")
    .eq("assignment_id", assignmentId)
    .eq("class_id", profile.class_id)
    .maybeSingle();

  return !!link;
}

export async function submitAssignmentAction(
  assignmentId: string,
  answers: AnswerInput[]
): Promise<{ error: string | null; results?: AnswerResult[]; attemptsUsed?: number; locked?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  // E3 — assignmentId muss eine gueltige UUID sein.
  if (!z.string().uuid().safeParse(assignmentId).success) {
    return { error: "Ungueltige Aufgabe." };
  }

  // E3 — answers per Zod validieren (unbeantwortete Items vorab entfernen).
  const nonEmptyAnswers = answers.filter(
    (a) =>
      (a.textAnswer != null && a.textAnswer !== "") ||
      (a.selectedOptions != null && a.selectedOptions.length > 0)
  );
  const answersParsed = answersInputSchema.safeParse(nonEmptyAnswers);
  if (!answersParsed.success) {
    return { error: "Ungueltige Antworten." };
  }
  const validAnswers = answersParsed.data;

  const admin = createAdminClient();

  // E3 — Cross-Class-Zugriff verhindern: Aufgabe muss der Klasse des Kindes
  // zugewiesen sein, bevor irgendein Admin-Client-Zugriff erfolgt.
  if (!(await assignmentBelongsToChildClass(supabase, admin, assignmentId, user.id))) {
    return { error: "Diese Aufgabe ist deiner Klasse nicht zugewiesen." };
  }

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

  for (const ans of validAnswers) {
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

  // Antworten speichern. H4: is_correct wird hier bewusst NICHT gesetzt
  // (Insert = NULL) — die Bewertung der Multiple-Choice-Items erfolgt
  // ueber die Lehrer-/Service-Role-Seite. Das Kind sieht das Ergebnis
  // weiterhin in `results`, aber persistiert wird die Korrektheit nicht
  // ueber das Kind-Konto.
  const answerRows = validAnswers.map((a) => ({
    submission_id: submissionId,
    item_id: a.itemId,
    text_answer: a.textAnswer ?? null,
    selected_options: a.selectedOptions ?? null,
    is_correct: null,
  }));

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

  // E3 — assignmentId validieren.
  if (!z.string().uuid().safeParse(assignmentId).success) {
    return { error: "Ungueltige Aufgabe." };
  }

  const admin = createAdminClient();

  // E3 — Cross-Class-Zugriff verhindern, bevor der Admin-Client genutzt wird.
  if (!(await assignmentBelongsToChildClass(supabase, admin, assignmentId, user.id))) {
    return { error: "Diese Aufgabe ist deiner Klasse nicht zugewiesen." };
  }

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
