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

  // Subscription-Tier setzen (D-09: kein echtes Payment, simulierter Checkout).
  // Audit H3: Das direkte UPDATE auf schools wurde durch die SECURITY-DEFINER-RPC
  // upgrade_school_tier ersetzt. Sie validiert Rolle und Tier server-seitig und
  // aendert ausschliesslich subscription_tier der eigenen Schule.
  const { error } = await supabase.rpc("upgrade_school_tier", { tier });

  if (error) throw new Error("Upgrade fehlgeschlagen.");

  // D-10: Redirect zu /kind/ueben nach erfolgreichem Upgrade
  redirect("/kind/ueben");
}
