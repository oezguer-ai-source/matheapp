import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButtonChild } from "@/components/child/logout-button";

export const metadata: Metadata = {
  title: "Matheapp — Startseite",
};

export default async function KindDashboardPage() {
  const supabase = await createClient();
  const { data: claimsResult } = await supabase.auth.getClaims();
  if (!claimsResult?.claims) {
    redirect("/login");
  }

  const userId = claimsResult.claims.sub;
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("user_id", userId)
    .maybeSingle();

  // Middleware already redirects non-child users away, but belt-and-braces:
  if (!profile || profile.role !== "child") {
    redirect("/login");
  }

  return (
    <main className="min-h-dvh bg-white p-8 flex flex-col">
      <h1 className="text-4xl font-semibold text-slate-900">
        Hallo, {profile.display_name}!
      </h1>
      <p className="text-xl text-slate-600 mt-4">
        Bald kannst du hier rechnen und Punkte sammeln.
      </p>

      <div className="mt-auto lg:self-end">
        <LogoutButtonChild />
      </div>
    </main>
  );
}
