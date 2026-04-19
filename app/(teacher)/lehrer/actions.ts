"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSyntheticEmail, padPin } from "@/lib/supabase/pin-email";
import { z } from "zod";

const classNameSchema = z
  .string()
  .min(1, { message: "Bitte geben Sie einen Klassennamen ein." })
  .max(100, { message: "Der Klassenname darf hoechstens 100 Zeichen lang sein." });

export type ClassActionState = { error: string | null; success?: boolean };

export async function createClassAction(
  _prev: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  const parsed = classNameSchema.safeParse(formData.get("className"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." };
  }

  const className = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht angemeldet." };
  }

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
    .insert({ name: className, school_id: schoolId, teacher_id: user.id });

  if (classError) {
    return { error: "Klasse konnte nicht erstellt werden." };
  }

  revalidatePath("/lehrer");
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

  // Verify the teacher owns this class
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const admin = createAdminClient();
  const { data: classData } = await admin
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!classData) return { error: "Klasse nicht gefunden." };

  // Klassenstufe aus dem Klassennamen ableiten (z.B. "3a" → 3, "2B" → 2)
  const { data: classInfo } = await admin
    .from("classes")
    .select("name")
    .eq("id", classId)
    .single();
  const gradeMatch = classInfo?.name?.match(/^(\d)/);
  const gradeLevel = gradeMatch ? Math.min(Math.max(parseInt(gradeMatch[1], 10), 1), 4) : 1;

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
