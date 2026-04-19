import { z } from "zod";

// Matches the regex used in `buildSyntheticEmail` (post-lowercasing).
const USERNAME_REGEX = /^[a-zäöüß0-9._-]+$/;

export const childLoginSchema = z.object({
  username: z
    .string()
    .min(1, { message: "Bitte gib deinen Benutzernamen ein." })
    .transform((v) => v.toLowerCase())
    .pipe(
      z.string().regex(USERNAME_REGEX, {
        message:
          "Der Benutzername darf nur Buchstaben, Zahlen, Punkte, Bindestriche und Unterstriche enthalten.",
      })
    ),
  pin: z.string().regex(/^\d{4}$/, {
    message: "Bitte gib alle 4 Ziffern ein.",
  }),
});

export const teacherLoginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Bitte geben Sie eine gültige E-Mail-Adresse ein." })
    .email({ message: "Bitte geben Sie eine gültige E-Mail-Adresse ein." }),
  password: z
    .string()
    .min(1, { message: "Bitte geben Sie Ihr Passwort ein." }),
});

export const teacherSignupSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Bitte geben Sie Ihren Namen ein." })
    .max(100, { message: "Der Name darf höchstens 100 Zeichen lang sein." }),
  email: z
    .string()
    .email({ message: "Bitte geben Sie eine gültige E-Mail-Adresse ein." }),
  password: z
    .string()
    .min(8, { message: "Das Passwort muss mindestens 8 Zeichen lang sein." }),
});

export type ChildLoginInput = z.infer<typeof childLoginSchema>;
export type TeacherLoginInput = z.infer<typeof teacherLoginSchema>;
export type TeacherSignupInput = z.infer<typeof teacherSignupSchema>;
