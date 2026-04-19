"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { teacherSignupSchema } from "@/lib/schemas/auth";

export type SignupActionState = { error: string | null; success?: boolean };

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
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? GENERIC_SIGNUP_ERROR;
    return { error: msg };
  }

  const { name, email, password } = parsed.data;

  // Step 1: Sign up via the public API. When enable_confirmations = true in
  // Supabase config, this sends a confirmation email automatically.
  const headersList = await headers();
  const origin = headersList.get("origin") || "http://localhost:3000";

  const supabase = await createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (signUpError || !signUpData.user) {
    const lower = (signUpError?.message ?? "").toLowerCase();
    const isDuplicate =
      lower.includes("already") ||
      lower.includes("registered") ||
      lower.includes("duplicate");
    return { error: isDuplicate ? DUPLICATE_EMAIL_ERROR : GENERIC_SIGNUP_ERROR };
  }

  // Supabase returns an empty identities array for already-registered emails
  // (to prevent user enumeration). Detect this case explicitly.
  if (signUpData.user.identities?.length === 0) {
    return { error: DUPLICATE_EMAIL_ERROR };
  }

  const teacherId = signUpData.user.id;
  const admin = createAdminClient();

  // Step 2: Set app_metadata.role via admin so middleware and RLS see the role.
  const { error: metaError } = await admin.auth.admin.updateUserById(
    teacherId,
    { app_metadata: { role: "teacher" } }
  );
  if (metaError) {
    await admin.auth.admin.deleteUser(teacherId);
    return { error: GENERIC_SIGNUP_ERROR };
  }

  // Step 3: Create the teacher profile (no class yet — classes are added later
  // from the dashboard).
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      user_id: teacherId,
      role: "teacher",
      display_name: name,
      class_id: null,
      grade_level: null,
    },
    { onConflict: "user_id" }
  );
  if (profileError) {
    await admin.auth.admin.deleteUser(teacherId);
    return { error: GENERIC_SIGNUP_ERROR };
  }

  // Step 4: Clear any session cookies that signUp() may have set (happens when
  // email confirmations are disabled on the Supabase instance).
  await supabase.auth.signOut();

  return { error: null, success: true };
}
