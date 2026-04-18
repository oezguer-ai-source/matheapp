import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type SubscriptionTier = "free" | "grundschule" | "foerderung" | "experte" | "demo";

/**
 * Laedt den subscription_tier der Schule fuer das aktuelle Kind.
 * Pfad: profiles.class_id -> classes.school_id -> schools.subscription_tier
 * Gibt 'free' als Fallback zurueck wenn kein Ergebnis.
 */
export async function getSchoolSubscriptionTier(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<SubscriptionTier> {
  // 1. class_id aus Profil laden
  const { data: profile } = await supabase
    .from("profiles")
    .select("class_id")
    .eq("user_id", userId)
    .single();

  if (!profile?.class_id) return "free";

  // 2. school_id aus Klasse laden
  const { data: cls } = await supabase
    .from("classes")
    .select("school_id")
    .eq("id", profile.class_id)
    .single();

  if (!cls?.school_id) return "free";

  // 3. subscription_tier aus Schule laden
  const { data: school } = await supabase
    .from("schools")
    .select("subscription_tier")
    .eq("id", cls.school_id)
    .single();

  return (school?.subscription_tier as SubscriptionTier) ?? "free";
}

/**
 * Prueft ob ein Kind durch das Subscription-Gate blockiert wird.
 * Blockiert NUR wenn: Klasse 4 UND subscription_tier === 'free'.
 * Demo-Tier wird durchgelassen (per D-12).
 */
export function isGated(gradeLevel: number, tier: SubscriptionTier): boolean {
  return gradeLevel === 4 && tier === "free";
}
