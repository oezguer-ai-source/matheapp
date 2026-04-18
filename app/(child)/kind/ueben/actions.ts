"use server";

import { createClient } from "@/lib/supabase/server";
import { generateExercise } from "@/lib/exercises/generators";
import { compute } from "@/lib/exercises/generators";
import { computeNewDifficulty } from "@/lib/exercises/difficulty";
import { calculatePoints } from "@/lib/exercises/points";
import { OPERATOR_TO_TYPE } from "@/lib/exercises/types";
import { RANGES } from "@/lib/exercises/config";
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
} from "@/lib/schemas/exercise";

/**
 * Validate that submitted operands are plausible for the child's grade and difficulty.
 * Prevents trivial-exercise forgery (CR-01) without requiring server-side exercise storage.
 */
function validateOperandsForGrade(
  operand1: number,
  operand2: number,
  operator: Operator,
  grade: Grade,
  difficulty: Difficulty
): boolean {
  const config = RANGES[grade][difficulty];

  // Operator must be allowed for this grade/difficulty
  if (!config.operators.includes(operator)) {
    return false;
  }

  // Operands must be within the configured range (with allowances for generated patterns)
  switch (operator) {
    case "+":
    case "*":
      // Both operands must be in [min, max]
      return (
        operand1 >= config.min &&
        operand1 <= config.max &&
        operand2 >= config.min &&
        operand2 <= config.max
      );

    case "-":
      // Both operands in range, and operand1 >= operand2 (no negative results)
      return (
        operand1 >= config.min &&
        operand1 <= config.max &&
        operand2 >= config.min &&
        operand2 <= config.max &&
        operand1 >= operand2
      );

    case "/":
      // Answer-first approach: divisor in [max(2,min), max], dividend = quotient * divisor
      // Divisor must be >= 2, dividend must divide evenly
      if (operand2 < 2 || operand2 > config.max) return false;
      if (operand1 % operand2 !== 0) return false;
      // Quotient must be >= 1 and divisor must be in valid range
      const quotient = operand1 / operand2;
      if (quotient < 1) return false;
      // Dividend (operand1) can exceed config.max due to multiplication, but divisor must be in range
      if (operand2 < Math.max(2, config.min)) return false;
      return true;
  }
}

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

  // Validate operands against child's grade/difficulty to prevent trivial-exercise forgery (CR-01)
  const grade = profile.grade_level as Grade;
  if (
    !validateOperandsForGrade(
      operand1,
      operand2,
      operator as Operator,
      grade,
      currentDifficulty as Difficulty
    )
  ) {
    return { error: "Ungueltige Aufgabe fuer diese Klassenstufe." };
  }

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
