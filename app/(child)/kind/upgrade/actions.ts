"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { SubscriptionTier } from "@/lib/subscription/queries";

const VALID_TIERS: SubscriptionTier[] = ["grundschule", "foerderung", "experte"];

export async function upgradeSubscriptionAction(formData: FormData): Promise<void> {
  const tier = formData.get("tier") as string;

  // T-60-01: Validiere den Tier-Wert gegen Allowlist
  if (!VALID_TIERS.includes(tier as SubscriptionTier)) {
    throw new Error("Ungueltiges Abo-Paket.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // T-60-03: Auth-Check vor DB-Operation
  if (!user) redirect("/login");

  // Profil -> Klasse -> Schule aufloesen
  const { data: profile } = await supabase
    .from("profiles")
    .select("class_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.class_id) redirect("/kind/dashboard");

  const { data: cls } = await supabase
    .from("classes")
    .select("school_id")
    .eq("id", profile.class_id)
    .single();

  if (!cls?.school_id) redirect("/kind/dashboard");

  // Subscription-Tier setzen (D-09: kein echtes Payment, simulierter Checkout)
  // T-60-02: RLS beschraenkt UPDATE auf eigene Schule
  const { error } = await supabase
    .from("schools")
    .update({ subscription_tier: tier })
    .eq("id", cls.school_id);

  if (error) throw new Error("Upgrade fehlgeschlagen.");

  // D-10: Redirect zu /kind/ueben nach erfolgreichem Upgrade
  redirect("/kind/ueben");
}
