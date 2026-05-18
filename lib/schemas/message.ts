import { z } from "zod";

// Zod-Schema fuer das Erstellen einer Nachricht (Lehrer -> Klasse/Schueler,
// Kind -> Lehrer). Spiegelt den XOR-Constraint messages_target_check:
// Entweder genau recipient_id ODER genau class_id ist gesetzt.
export const createMessageSchema = z
  .object({
    // Genau eines von beiden muss gesetzt sein (XOR).
    recipientId: z.string().uuid().nullable().optional(),
    classId: z.string().uuid().nullable().optional(),
    subject: z
      .string()
      .max(200, { message: "Der Betreff darf hoechstens 200 Zeichen lang sein." })
      .default(""),
    body: z
      .string()
      .min(1, { message: "Die Nachricht darf nicht leer sein." })
      .max(5000, { message: "Die Nachricht darf hoechstens 5000 Zeichen lang sein." }),
  })
  .refine(
    (v) => Boolean(v.recipientId) !== Boolean(v.classId),
    {
      message:
        "Es muss genau ein Ziel gesetzt sein: entweder ein Empfaenger oder eine Klasse.",
      path: ["recipientId"],
    }
  );

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
