import { z } from "zod";

export const focusSchema = z.union([
  z.object({
    kind: z.literal("times_table"),
    factor: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal("divide_by"),
    factor: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal("add_up_to"),
    max: z.union([
      z.literal(10),
      z.literal(20),
      z.literal(50),
      z.literal(100),
      z.literal(1000),
    ]),
  }),
  z.object({
    kind: z.literal("sub_up_to"),
    max: z.union([
      z.literal(10),
      z.literal(20),
      z.literal(50),
      z.literal(100),
      z.literal(1000),
    ]),
  }),
]);

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
  focus: focusSchema.optional(),
});

export type GenerateExerciseInput = z.infer<typeof generateExerciseSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
