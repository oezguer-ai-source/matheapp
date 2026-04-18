import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButtonChild } from "@/components/child/logout-button";
import { DashboardStats, ProgressBar } from "@/components/child/dashboard-stats";
import { MINIGAME_THRESHOLD } from "@/lib/config/rewards";

export const metadata: Metadata = {
  title: "Matheapp -- Startseite",
};

export default async function KindDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Fetch profile with grade_level
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, grade_level, role")
    .eq("user_id", user.id)
    .maybeSingle();

  // Belt-and-braces role check (middleware already guards)
  if (!profile || profile.role !== "child") {
    redirect("/login");
  }

  // Fetch progress entries to compute totals (aggregate functions not available via PostgREST)
  // T-30-01: RLS ensures child_id = auth.uid()
  const { data: entries } = await supabase
    .from("progress_entries")
    .select("points_earned")
    .eq("child_id", user.id);

  const totalPoints = (entries ?? []).reduce((sum, e) => sum + (e.points_earned ?? 0), 0);
  const exerciseCount = (entries ?? []).length;

  return (
    <main className="min-h-dvh bg-white p-6 flex flex-col gap-6">
      <DashboardStats
        totalPoints={totalPoints}
        exerciseCount={exerciseCount}
        gradeLevel={profile.grade_level ?? 1}
        displayName={profile.display_name ?? "Kind"}
      />

      <ProgressBar currentPoints={totalPoints} />

      <Link
        href="/kind/ueben"
        className="h-16 flex items-center justify-center rounded-2xl bg-child-green text-white text-3xl font-semibold hover:opacity-90 focus:ring-4 focus:ring-child-green/50 focus:ring-offset-2 focus:outline-none"
      >
        Aufgaben starten
      </Link>

      {totalPoints >= MINIGAME_THRESHOLD ? (
        <Link
          href="/kind/spiel"
          className="h-16 flex items-center justify-center rounded-2xl bg-child-yellow text-slate-900 text-3xl font-semibold hover:opacity-90 focus:ring-4 focus:ring-child-yellow/50 focus:ring-offset-2 focus:outline-none"
        >
          Spiel starten
        </Link>
      ) : (
        <div className="h-16 flex items-center justify-center rounded-2xl bg-slate-200 text-slate-400 text-3xl font-semibold cursor-not-allowed">
          Spiel starten
        </div>
      )}

      <div className="mt-auto">
        <LogoutButtonChild />
      </div>
    </main>
  );
}
