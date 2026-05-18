import { z } from "zod";

// ============================================================
// Aufgaben-Erstellung (assignments + assignment_items)
// ============================================================

// Ein einzelnes Aufgaben-Item: Freitext ('text') oder Multiple-Choice ('choice').
// Der refine() stellt die Choice-Konsistenz sicher:
//   - 'text'   -> options/correct_options muessen leer sein
//   - 'choice' -> mindestens 2 Optionen, correct_options nicht leer und alle
//                 Indizes liegen innerhalb des Options-Arrays.
export const assignmentItemSchema = z
  .object({
    itemType: z.enum(["text", "choice"]),
    question: z
      .string()
      .min(1, { message: "Die Frage darf nicht leer sein." })
      .max(1000, { message: "Die Frage darf hoechstens 1000 Zeichen lang sein." }),
    sortOrder: z.number().int().min(0).default(0),
    // Bei 'choice': Liste der Antwortoptionen.
    options: z
      .array(z.string().min(1).max(300))
      .max(8, { message: "Es sind hoechstens 8 Antwortoptionen erlaubt." })
      .optional(),
    // Bei 'choice': Indizes der korrekten Optionen.
    correctOptions: z.array(z.number().int().min(0)).optional(),
  })
  .superRefine((item, ctx) => {
    if (item.itemType === "text") {
      if (item.options && item.options.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Freitext-Aufgaben duerfen keine Antwortoptionen haben.",
          path: ["options"],
        });
      }
      if (item.correctOptions && item.correctOptions.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Freitext-Aufgaben duerfen keine korrekten Optionen haben.",
          path: ["correctOptions"],
        });
      }
      return;
    }

    // itemType === 'choice'
    const options = item.options ?? [];
    const correct = item.correctOptions ?? [];

    if (options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Multiple-Choice-Aufgaben brauchen mindestens 2 Antwortoptionen.",
        path: ["options"],
      });
    }
    if (correct.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Es muss mindestens eine korrekte Antwort markiert sein.",
        path: ["correctOptions"],
      });
    }
    // Alle korrekten Indizes muessen innerhalb des Options-Arrays liegen.
    for (const idx of correct) {
      if (idx >= options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Der Index ${idx} zeigt auf keine vorhandene Option.`,
          path: ["correctOptions"],
        });
      }
    }
    // Keine doppelten korrekten Indizes.
    if (new Set(correct).size !== correct.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Korrekte Optionen duerfen nicht doppelt markiert sein.",
        path: ["correctOptions"],
      });
    }
  });

export const createAssignmentSchema = z.object({
  title: z
    .string()
    .min(1, { message: "Der Titel darf nicht leer sein." })
    .max(200, { message: "Der Titel darf hoechstens 200 Zeichen lang sein." }),
  description: z
    .string()
    .max(2000, { message: "Die Beschreibung darf hoechstens 2000 Zeichen lang sein." })
    .default(""),
  // due_date ist NOT NULL in der DB.
  dueDate: z
    .string()
    .datetime({ message: "Bitte ein gueltiges Faelligkeitsdatum angeben." }),
  // Klassen, denen die Aufgabe zugewiesen wird (assignment_classes).
  classIds: z
    .array(z.string().uuid())
    .min(1, { message: "Die Aufgabe muss mindestens einer Klasse zugewiesen werden." }),
  // Mindestens ein Item.
  items: z
    .array(assignmentItemSchema)
    .min(1, { message: "Die Aufgabe braucht mindestens eine Frage." })
    .max(50, { message: "Eine Aufgabe darf hoechstens 50 Fragen enthalten." }),
});

// ============================================================
// Submission-Antworten (submission_answers)
// ============================================================

// Eine einzelne Antwort eines Schuelers auf ein Item.
// is_correct ist bewusst NICHT Teil des Schemas — die Bewertung erfolgt
// server-seitig (Audit H4: is_correct ist fuer Schueler schreibgeschuetzt).
export const submissionAnswerSchema = z
  .object({
    itemId: z.string().uuid(),
    // Genau eines von beiden je nach Item-Typ.
    textAnswer: z
      .string()
      .max(2000, { message: "Die Antwort darf hoechstens 2000 Zeichen lang sein." })
      .nullable()
      .optional(),
    selectedOptions: z.array(z.number().int().min(0)).nullable().optional(),
  })
  .refine(
    (v) =>
      (v.textAnswer != null && v.textAnswer !== "") ||
      (v.selectedOptions != null && v.selectedOptions.length > 0),
    {
      message: "Es muss eine Antwort angegeben werden.",
      path: ["textAnswer"],
    }
  );

// Komplette Abgabe: alle Antworten einer Submission auf einmal.
export const submitAnswersSchema = z.object({
  submissionId: z.string().uuid(),
  answers: z
    .array(submissionAnswerSchema)
    .min(1, { message: "Es muss mindestens eine Antwort abgegeben werden." }),
});

export type AssignmentItemInput = z.infer<typeof assignmentItemSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type SubmissionAnswerInput = z.infer<typeof submissionAnswerSchema>;
export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;
