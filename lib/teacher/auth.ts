import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ergebnis von requireTeacher(): bei Erfolg die User-ID des angemeldeten
 * Lehrers, sonst eine Fehlermeldung.
 */
export type RequireTeacherResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Stellt sicher, dass die aufrufende Server-Action von einem angemeldeten
 * Lehrer ausgefuehrt wird (Audit A3 — Rollen-Pruefung).
 *
 * Prueft:
 *   1. Es gibt einen angemeldeten User.
 *   2. Sein Profil existiert und hat role === 'teacher'.
 *
 * Zu Beginn jeder Lehrer-Server-Action aufrufen. Bei { ok: false } muss die
 * Action sofort mit der gelieferten Fehlermeldung abbrechen.
 */
export async function requireTeacher(): Promise<RequireTeacherResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  // Profil/Rolle ueber den Admin-Client lesen, damit die Pruefung nicht von
  // RLS-Sichtbarkeit des Profils abhaengt.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "teacher") {
    return { ok: false, error: "Kein Zugriff. Diese Aktion ist Lehrkraeften vorbehalten." };
  }

  return { ok: true, userId: user.id };
}
