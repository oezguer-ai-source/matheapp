"use server";

import { createClient } from "@/lib/supabase/server";
import { generateExercise } from "@/lib/exercises/generators";
import { compute } from "@/lib/exercises/generators";
import { computeNewDifficulty } from "@/lib/exercises/difficulty";
import { calculatePoints } from "@/lib/exercises/points";
import { OPERATOR_TO_TYPE } from "@/lib/exercises/types";
import type {
  ClientExercise,
  Difficulty,
  Operator,
  SubmitAnswerResult,
} from "@/lib/exercises/types";
import {
  generateExerciseSchema,
  submitAnswerSchema,
} from "@/lib/schemas/exercise";

export async function generateExerciseAction(
  grade: number,
  difficulty: Difficulty
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

  const exercise = generateExercise(
    parsed.data.grade,
    parsed.data.difficulty as Difficulty
  );

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
  } = parsed.data;

  // Server re-computes correct answer from operands (Pattern 3)
  const correctAnswer = compute(operand1, operand2, operator as Operator);
  const correct = userAnswer === correctAnswer;

  const pointsEarned = calculatePoints(correct, currentDifficulty as Difficulty);

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

  return {
    data: {
      correct,
      correctAnswer,
      pointsEarned,
      newDifficulty,
      newCorrectStreak,
      newIncorrectStreak,
    },
  };
}
