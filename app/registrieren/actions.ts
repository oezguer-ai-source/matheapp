"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { teacherSignupSchema } from "@/lib/schemas/auth";

export type SignupActionState = { error: string | null };

const GENERIC_SIGNUP_ERROR =
  "Die Registrierung ist fehlgeschlagen. Bitte versuchen Sie es erneut.";
const DUPLICATE_EMAIL_ERROR =
  "Mit dieser E-Mail existiert bereits ein Konto.";

export async function teacherSignup(
  _prev: SignupActionState,
  formData: FormData
): Promise<SignupActionState> {
  const parsed = teacherSignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    schoolName: formData.get("schoolName"),
    className: formData.get("className"),
  });
  if (!parsed.success) {
    // Surface the first validation message so the UI can show the specific field error.
    const msg = parsed.error.issues[0]?.message ?? GENERIC_SIGNUP_ERROR;
    return { error: msg };
  }

  const { name, email, password, schoolName, className } = parsed.data;
  const admin = createAdminClient();

  // Step 1: Create the auth user via the ADMIN API so app_metadata.role is set at
  // INSERT time. This fires the Plan 05 trigger (`on_auth_user_created_create_teacher_profile`)
  // which reads NEW.raw_app_meta_data->>'role' == 'teacher' and inserts the profile row.
  //
  // Why admin.createUser instead of the standard auth signUp flow:
  //   The standard signUp() does NOT let the client set app_metadata. The trigger
  //   checks raw_app_meta_data at INSERT time, so using signUp + a follow-up
  //   admin.updateUserById() would race: the trigger fires BEFORE the metadata patch.
  //   admin.createUser sets app_metadata atomically during the insert, eliminating the race.
  const { data: createData, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip the email-verification step for MVP (per D-06)
      app_metadata: { role: "teacher" },
      user_metadata: { name },
    });

  if (createError || !createData?.user) {
    const lower = (createError?.message ?? "").toLowerCase();
    const isDuplicate =
      lower.includes("already") ||
      lower.includes("registered") ||
      lower.includes("duplicate");
    return { error: isDuplicate ? DUPLICATE_EMAIL_ERROR : GENERIC_SIGNUP_ERROR };
  }

  const teacherId = createData.user.id;

  // Step 2: Atomically provision the teacher's school + first class (per D-13a).
  // Both inserts use the admin client so RLS cannot block them mid-signup. If either
  // step fails, we undo the created user to avoid orphans.
  let schoolId: string | null = null;
  let classId: string | null = null;
  try {
    const { data: school, error: schoolError } = await admin
      .from("schools")
      .insert({ name: schoolName, subscription_tier: "free" })
      .select("id")
      .single();
    if (schoolError || !school) throw schoolError ?? new Error("school insert failed");
    schoolId = school.id;

    const { data: cls, error: classError } = await admin
      .from("classes")
      .insert({ name: className, school_id: schoolId, teacher_id: teacherId })
      .select("id")
      .single();
    if (classError || !cls) throw classError ?? new Error("class insert failed");
    classId = cls.id;

    // Step 3: Upsert the teacher's profile. The DB trigger on auth.users may not fire
    // on Supabase Cloud (GoTrue bypasses custom triggers), so we create-or-update the
    // profile explicitly to guarantee it exists with the correct class_id.
    const { error: profileUpsertError } = await admin
      .from("profiles")
      .upsert(
        {
          user_id: teacherId,
          role: "teacher",
          display_name: name,
          class_id: classId,
          grade_level: null,
        },
        { onConflict: "user_id" }
      );
    if (profileUpsertError) throw profileUpsertError;
  } catch {
    // Rollback: delete the class, school, and user so the operator can retry cleanly.
    try {
      if (classId) await admin.from("classes").delete().eq("id", classId);
      if (schoolId) await admin.from("schools").delete().eq("id", schoolId);
      await admin.auth.admin.deleteUser(teacherId);
    } catch (rollbackErr) {
      // Log rollback failure for operational visibility — orphaned rows may need manual cleanup.
      console.error("[teacherSignup] rollback failed:", rollbackErr);
    }
    return { error: GENERIC_SIGNUP_ERROR };
  }

  // Step 4: Sign the teacher in via the user-context client so cookies are set on
  // the response. The dashboard loads immediately after redirect.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    // Auth user and school/class exist; the teacher can still log in manually.
    return { error: GENERIC_SIGNUP_ERROR };
  }

  redirect("/lehrer/dashboard");
}
