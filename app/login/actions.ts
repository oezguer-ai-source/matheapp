"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSyntheticEmail, padPin } from "@/lib/supabase/pin-email";
import { childLoginSchema, teacherLoginSchema } from "@/lib/schemas/auth";

export type LoginActionState = { error: string | null };

// Security: one generic message for ALL child login failures (RESEARCH Pitfall 6).
const GENERIC_CHILD_ERROR =
  "Benutzername oder PIN stimmt nicht. Frag deine Lehrerin oder deinen Lehrer.";
// Security: one generic message for ALL teacher login failures.
const GENERIC_TEACHER_ERROR = "E-Mail oder Passwort ist nicht korrekt.";

export async function childLogin(
  _prev: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = childLoginSchema.safeParse({
    username: formData.get("username"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) {
    return { error: GENERIC_CHILD_ERROR };
  }

  // Per RESEARCH Assumption A2 (ACCEPTED): username -> class_id lookup uses the
  // ADMIN client (service-role key, bypasses RLS). A permissive anon-readable
  // display_name policy would enable user enumeration attacks.
  // TODO: If two children in different classes share the same display_name,
  // maybeSingle() returns an error (PGRST116: multiple rows). Consider adding
  // a class_id disambiguator to the login flow or enforcing global username uniqueness.
  const admin = createAdminClient();
  const { data: profile, error: lookupError } = await admin
    .from("profiles")
    .select("class_id, user_id")
    .eq("display_name", parsed.data.username)
    .eq("role", "child")
    .maybeSingle();

  if (lookupError || !profile || !profile.class_id) {
    return { error: GENERIC_CHILD_ERROR };
  }

  let email: string;
  let passwordProxy: string;
  try {
    email = buildSyntheticEmail(parsed.data.username, profile.class_id);
    passwordProxy = padPin(parsed.data.pin, profile.class_id);
  } catch {
    return { error: GENERIC_CHILD_ERROR };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: passwordProxy,
  });

  if (signInError) {
    return { error: GENERIC_CHILD_ERROR };
  }

  redirect("/kind/dashboard");
}

export async function teacherLogin(
  _prev: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = teacherLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: GENERIC_TEACHER_ERROR };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: GENERIC_TEACHER_ERROR };
  }

  redirect("/lehrer/dashboard");
}

// Logout action — reused by child + teacher Abmelden buttons in Plan 08.
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
