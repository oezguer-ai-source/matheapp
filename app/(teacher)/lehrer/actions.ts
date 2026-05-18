"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSyntheticEmail, padPin } from "@/lib/supabase/pin-email";
import { requireTeacher } from "@/lib/teacher/auth";
import { z } from "zod";
import {
  createClassSchema,
  setClassGradeSchema,
} from "@/lib/schemas/class";

export type ClassActionState = { error: string | null; success?: boolean };

export async function createClassAction(
  _prev: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  const parsed = createClassSchema.safeParse({
    className: formData.get("className"),
    grade: formData.get("grade"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." };
  }

  const { className, grade } = parsed.data;

  // A3 — Rollen-Pruefung
  const auth = await requireTeacher();
  if (!auth.ok) return { error: auth.error };
  const user = { id: auth.userId };

  const admin = createAdminClient();

  // Check if teacher already has a school — if not, create a default one.
  const { data: existingClass } = await admin
    .from("classes")
    .select("school_id")
    .eq("teacher_id", user.id)
    .limit(1)
    .maybeSingle();

  let schoolId: string;

  if (existingClass?.school_id) {
    schoolId = existingClass.school_id;
  } else {
    // Create a default school for this teacher
    const { data: school, error: schoolError } = await admin
      .from("schools")
      .insert({ name: "Meine Schule", subscription_tier: "free" })
      .select("id")
      .single();
    if (schoolError || !school) {
      return { error: "Schule konnte nicht erstellt werden." };
    }
    schoolId = school.id;
  }

  // Create the class
  const { error: classError } = await admin
    .from("classes")
    .insert({ name: className, school_id: schoolId, teacher_id: user.id, grade });

  if (classError) {
    return { error: "Klasse konnte nicht erstellt werden." };
  }

  revalidatePath("/lehrer");
  return { error: null, success: true };
}

// --- Klassenstufe einer bestehenden Klasse setzen/aendern ---
//
// Noetig fuer Bestandsklassen (grade = NULL), die vor Bug-3-Fix angelegt
// wurden. Ohne gepflegte Stufe koennen keine neuen Schueler hinzugefuegt
// werden (siehe addStudentAction).

export async function setClassGradeAction(
  _prev: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  const parsed = setClassGradeSchema.safeParse({
    classId: formData.get("classId"),
    grade: formData.get("grade"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." };
  }

  const { classId, grade } = parsed.data;

  const auth = await requireTeacher();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();

  // Eigentum pruefen
  const { data: classData } = await admin
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", auth.userId)
    .maybeSingle();

  if (!classData) return { error: "Klasse nicht gefunden." };

  const { error: updateError } = await admin
    .from("classes")
    .update({ grade })
    .eq("id", classId);

  if (updateError) {
    return { error: "Klassenstufe konnte nicht gespeichert werden." };
  }

  // Bestehende Schueler dieser Klasse auf die neue Stufe nachziehen, damit
  // vor dem Fix mit falschem grade_level (Default 1) angelegte Kinder
  // korrigiert werden. Aufgaben-Zuordnung laeuft danach ueber die richtige Stufe.
  await admin
    .from("profiles")
    .update({ grade_level: grade })
    .eq("class_id", classId)
    .eq("role", "child");

  revalidatePath("/lehrer");
  revalidatePath(`/lehrer/klasse/${classId}`);
  return { error: null, success: true };
}

// --- Schüler hinzufügen ---

const addStudentSchema = z.object({
  firstName: z
    .string()
    .min(1, { message: "Bitte geben Sie den Vornamen ein." })
    .max(50)
    .transform((v) => v.trim()),
  lastName: z
    .string()
    .min(1, { message: "Bitte geben Sie den Nachnamen ein." })
    .max(50)
    .transform((v) => v.trim()),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Bitte geben Sie ein gültiges Geburtsdatum ein." }),
  classId: z.string().uuid(),
});

export type StudentActionState = { error: string | null; success?: boolean };

export async function addStudentAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const parsed = addStudentSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate"),
    classId: formData.get("classId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const { firstName, lastName, birthDate, classId } = parsed.data;

  // Username = vorname.nachname (lowercase)
  const username = `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, ".");
  const fullName = `${firstName} ${lastName}`;

  // PIN = TTMM aus dem Geburtsdatum (Format: YYYY-MM-DD)
  const [, month, day] = birthDate.split("-");
  const pin = `${day}${month}`;

  // A3 — Rollen-Pruefung
  const auth = await requireTeacher();
  if (!auth.ok) return { error: auth.error };
  const user = { id: auth.userId };

  // Verify the teacher owns this class — und Klassenstufe gleich mitladen.
  const admin = createAdminClient();
  const { data: classData } = await admin
    .from("classes")
    .select("id, grade")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!classData) return { error: "Klasse nicht gefunden." };

  // Bug-3-Fix: Klassenstufe wird NICHT mehr aus dem Namen geraten, sondern
  // direkt aus classes.grade gelesen. Ist die Stufe noch nicht gepflegt
  // (Bestandsklasse, grade = NULL), bricht das Anlegen mit klarer Meldung ab —
  // statt still grade_level 1 zu vergeben.
  const gradeLevel = classData.grade;
  if (gradeLevel == null) {
    return {
      error:
        "Bitte zuerst die Klassenstufe dieser Klasse pflegen, bevor Sie Schüler hinzufügen.",
    };
  }

  // Synthetische Zugangsdaten für das Kind erstellen
  let email: string;
  let password: string;
  try {
    email = buildSyntheticEmail(username, classId);
    password = padPin(pin, classId);
  } catch {
    return { error: "Ungültiger Name. Bitte nur Buchstaben, Zahlen und Punkte verwenden." };
  }

  // Auth-User für das Kind erstellen
  const { data: childUser, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "child" },
      user_metadata: { name: fullName, birthDate },
    });

  if (createError || !childUser?.user) {
    const msg = (createError?.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("duplicate")) {
      return { error: "Ein Schüler mit diesem Namen existiert bereits in dieser Klasse." };
    }
    return { error: "Schüler konnte nicht erstellt werden." };
  }

  // Profil erstellen — display_name = Username (für Login-Lookup)
  const { error: profileError } = await admin.from("profiles").insert({
    user_id: childUser.user.id,
    role: "child",
    display_name: username,
    class_id: classId,
    grade_level: gradeLevel,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(childUser.user.id);
    const msg = (profileError.message ?? "").toLowerCase();
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { error: "Ein Schüler mit diesem Namen existiert bereits in dieser Klasse." };
    }
    return { error: "Profil konnte nicht erstellt werden." };
  }

  revalidatePath(`/lehrer/klasse/${classId}`);
  return { error: null, success: true };
}
