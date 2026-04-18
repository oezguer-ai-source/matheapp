import { z } from "zod";

export const generateExerciseSchema = z.object({
  grade: z.number().int().min(1).max(4),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const submitAnswerSchema = z.object({
  exerciseId: z.string().uuid(),
  operand1: z.number().int().min(1),
  operand2: z.number().int().min(1),
  operator: z.enum(["+", "-", "*", "/"]),
  userAnswer: z.number().int(),
  currentDifficulty: z.enum(["easy", "medium", "hard"]),
  correctStreak: z.number().int().min(0),
  incorrectStreak: z.number().int().min(0),
});

export type GenerateExerciseInput = z.infer<typeof generateExerciseSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
