"use server";

import { createClient } from "@/lib/supabase/server";
import { generateExercise, compute } from "@/lib/exercises/generators";
import { computeNewDifficulty } from "@/lib/exercises/difficulty";
import { calculatePoints } from "@/lib/exercises/points";
import { OPERATOR_TO_TYPE } from "@/lib/exercises/types";
import {
  generateFocusedExercise,
  validateOperandsForFocus,
  type ExerciseFocus,
} from "@/lib/exercises/focus";
import {
  deriveDifficultyFromOperands,
  deriveDifficultyFromFocus,
} from "@/lib/exercises/derive-difficulty";
import { recordActivity } from "@/lib/avatar/service";
import { getSchoolSubscriptionTier, isGated } from "@/lib/subscription/queries";
import type {
  ClientExercise,
  Difficulty,
  Grade,
  Operator,
  SubmitAnswerResult,
} from "@/lib/exercises/types";
import {
  generateExerciseSchema,
  submitAnswerSchema,
  focusSchema,
} from "@/lib/schemas/exercise";

/**
 * E2 — Abo-Gating: Prueft serverseitig, ob das Kind durch das Subscription-Gate
 * blockiert wird (Klasse 4 ohne aktives Abo). Liefert eine Fehlermeldung oder
 * `null`, wenn der Zugriff erlaubt ist.
 */
async function assertNotGated(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_level")
    .eq("user_id", userId)
    .maybeSingle();

  const grade = profile?.grade_level ?? 0;
  const tier = await getSchoolSubscriptionTier(supabase, userId);

  if (isGated(grade, tier)) {
    return "Dieser Bereich ist im aktuellen Abo nicht freigeschaltet.";
  }
  return null;
}

export async function generateExerciseAction(
  grade: number,
  difficulty: Difficulty,
  operatorFilter?: Operator[],
  focus?: ExerciseFocus
): Promise<{ data?: ClientExercise; error?: string }> {
  const parsed = generateExerciseSchema.safeParse({ grade, difficulty });
  if (!parsed.success) {
    return { error: "Ungueltige Eingabe." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Nicht angemeldet." };
  }

  // E2 — Abo-Gating serverseitig: Klasse 4 ohne aktives Abo wird blockiert.
  const gateError = await assertNotGated(supabase, user.id);
  if (gateError) {
    return { error: gateError };
  }

  // Focus-Modus: gezielte Aufgabe (Einmaleins mit 7, Plus bis 20, etc.)
  if (focus) {
    const focusParsed = focusSchema.safeParse(focus);
    if (!focusParsed.success) {
      return { error: "Ungueltiger Fokus." };
    }
    const exercise = generateFocusedExercise(focusParsed.data);
    return {
      data: {
        id: exercise.id,
        operand1: exercise.operand1,
        operand2: exercise.operand2,
        operator: exercise.operator,
      },
    };
  }

  // Generiere Aufgaben bis der Operator zum Filter passt (max 20 Versuche)
  let exercise = generateExercise(
    parsed.data.grade,
    parsed.data.difficulty as Difficulty
  );

  if (operatorFilter && operatorFilter.length > 0 && operatorFilter.length < 4) {
    for (let i = 0; i < 20; i++) {
      if (operatorFilter.includes(exercise.operator)) break;
      exercise = generateExercise(
        parsed.data.grade,
        parsed.data.difficulty as Difficulty
      );
    }
  }

  // Return WITHOUT correctAnswer (D-04, Pitfall 3)
  return {
    data: {
      id: exercise.id,
      operand1: exercise.operand1,
      operand2: exercise.operand2,
      operator: exercise.operator,
    },
  };
}

export async function submitAnswerAction(input: {
  exerciseId: string;
  operand1: number;
  operand2: number;
  operator: "+" | "-" | "*" | "/";
  userAnswer: number;
  currentDifficulty: "easy" | "medium" | "hard";
  correctStreak: number;
  incorrectStreak: number;
  focus?: ExerciseFocus;
}): Promise<{ data?: SubmitAnswerResult; error?: string }> {
  const parsed = submitAnswerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Ungueltige Eingabe." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Nicht angemeldet." };
  }

  // E2 — Abo-Gating serverseitig auch beim Absenden durchsetzen.
  const gateError = await assertNotGated(supabase, user.id);
  if (gateError) {
    return { error: gateError };
  }

  // Get child's grade from profile for the progress_entry record
  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_level")
    .eq("user_id", user.id)
    .single();

  if (!profile?.grade_level) {
    return { error: "Kein Profil gefunden." };
  }

  const {
    operand1,
    operand2,
    operator,
    userAnswer,
    currentDifficulty,
    correctStreak,
    incorrectStreak,
    focus,
  } = parsed.data;

  // Validation: Focus-Modus hat eigene Regeln, sonst Range-Check gegen Klassenstufe (CR-01).
  // D1 — Punkte-Manipulation: `effectiveDifficulty` wird serverseitig aus den
  // tatsaechlichen Operanden (bzw. dem Fokus) abgeleitet und ist die einzige
  // Grundlage fuer die Punktevergabe. Der Client-Wert `currentDifficulty` wird
  // NICHT mehr fuer Punkte verwendet (nur noch fuer die Streak-/Promotion-Logik,
  // die selbst keine Punkte vergibt).
  const grade = profile.grade_level as Grade;
  let effectiveDifficulty: Difficulty;
  if (focus) {
    if (!validateOperandsForFocus(operand1, operand2, operator as Operator, focus)) {
      return { error: "Ungueltige Aufgabe fuer diesen Fokus." };
    }
    effectiveDifficulty = deriveDifficultyFromFocus(focus);
  } else {
    const derived = deriveDifficultyFromOperands(
      operand1,
      operand2,
      operator as Operator,
      grade
    );
    if (derived === null) {
      return { error: "Ungueltige Aufgabe fuer diese Klassenstufe." };
    }
    effectiveDifficulty = derived;
  }

  // Server re-computes correct answer from operands (Pattern 3)
  const correctAnswer = compute(operand1, operand2, operator as Operator);

  // Guard: if division produced a non-integer, the exercise is invalid (WR-01)
  if (operator === "/" && !Number.isInteger(correctAnswer)) {
    return { error: "Ungueltige Aufgabe." };
  }

  const correct = userAnswer === correctAnswer;

  // D1 — Punkte aus der serverseitig abgeleiteten Schwierigkeit, nie aus dem
  // Client-Wert. So bringt eine triviale 1+1-Aufgabe nur Easy-Punkte (10),
  // egal welches `currentDifficulty` der Client behauptet.
  const pointsEarned = calculatePoints(correct, effectiveDifficulty);

  // Compute new streaks
  const newCorrectStreak = correct ? correctStreak + 1 : 0;
  const newIncorrectStreak = correct ? 0 : incorrectStreak + 1;

  const newDifficulty = computeNewDifficulty(
    currentDifficulty as Difficulty,
    newCorrectStreak,
    newIncorrectStreak
  );

  // Write progress_entry (D-24: always, correct or incorrect)
  const { error: insertError } = await supabase
    .from("progress_entries")
    .insert({
      child_id: user.id,
      operation_type: OPERATOR_TO_TYPE[operator as Operator],
      grade: profile.grade_level,
      correct,
      points_earned: pointsEarned,
    });

  if (insertError) {
    return { error: "Fehler beim Speichern." };
  }

  // Avatar-XP + Tages-Streak aktualisieren (nur bei positiven Punkten zählt als XP).
  const activity = await recordActivity(supabase, user.id, Math.max(0, pointsEarned));

  return {
    data: {
      correct,
      correctAnswer,
      pointsEarned,
      newDifficulty,
      newCorrectStreak,
      newIncorrectStreak,
      avatar: activity
        ? {
            levelUp: activity.levelUp,
            oldLevel: activity.oldLevel,
            newLevel: activity.newLevel,
            xp: activity.xp,
            currentStreak: activity.currentStreak,
          }
        : undefined,
    },
  };
}
