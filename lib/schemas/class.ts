import { z } from "zod";

// Klassenstufe 1-4. Quelle der Wahrheit fuer die Aufgaben-Zuordnung
// (siehe Bug-3-Fix: keine Ableitung mehr aus dem Klassennamen).
export const classGradeSchema = z.coerce
  .number({ message: "Bitte waehlen Sie eine Klassenstufe." })
  .int({ message: "Die Klassenstufe muss 1, 2, 3 oder 4 sein." })
  .min(1, { message: "Die Klassenstufe muss 1, 2, 3 oder 4 sein." })
  .max(4, { message: "Die Klassenstufe muss 1, 2, 3 oder 4 sein." });

export const classNameSchema = z
  .string()
  .min(1, { message: "Bitte geben Sie einen Klassennamen ein." })
  .max(100, {
    message: "Der Klassenname darf hoechstens 100 Zeichen lang sein.",
  });

// Neue Klasse anlegen — Klassenstufe ist Pflicht.
export const createClassSchema = z.object({
  className: classNameSchema,
  grade: classGradeSchema,
});

// Klassenstufe einer bestehenden Klasse setzen/aendern (Nachpflege von
// Bestandsklassen mit grade = NULL).
export const setClassGradeSchema = z.object({
  classId: z.string().uuid(),
  grade: classGradeSchema,
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type SetClassGradeInput = z.infer<typeof setClassGradeSchema>;
