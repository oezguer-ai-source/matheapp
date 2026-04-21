import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GAMES } from "@/lib/config/games";
import { fetchChildConversationAction } from "@/app/(child)/kind/nachrichten/actions";
import { ChildChat } from "@/components/child/child-chat";

export const metadata: Metadata = {
  title: "Matheapp — Startseite",
};

export default async function KindDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, grade_level, class_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  // Punkte & Aufgaben zählen
  const { data: entries } = await supabase
    .from("progress_entries")
    .select("points_earned")
    .eq("child_id", user.id);

  const totalPoints = (entries ?? []).reduce((sum, e) => sum + (e.points_earned ?? 0), 0);
  const exerciseCount = (entries ?? []).length;

  // Offene Aufgaben zählen
  let pendingAssignments = 0;
  if (profile.class_id) {
    const { data: assignedIds } = await supabase
      .from("assignment_classes")
      .select("assignment_id")
      .eq("class_id", profile.class_id);

    if (assignedIds && assignedIds.length > 0) {
      const ids = assignedIds.map((a) => a.assignment_id);

      const { data: submissions } = await supabase
        .from("assignment_submissions")
        .select("assignment_id")
        .eq("student_id", user.id)
        .eq("status", "submitted")
        .in("assignment_id", ids);

      const submittedIds = new Set((submissions ?? []).map((s) => s.assignment_id));
      pendingAssignments = ids.filter((id) => !submittedIds.has(id)).length;
    }
  }

  // Ungelesene Nachrichten zählen
  const { count: messageCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .or(`recipient_id.eq.${user.id},class_id.eq.${profile.class_id}`);

  const displayName = profile.display_name
    .split(".")
    .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  const firstGame = GAMES[0];
  const unlockedCount = GAMES.filter((g) => totalPoints >= g.unlockAt).length;
  const nextGame = GAMES.find((g) => totalPoints < g.unlockAt);
  const nextThreshold = nextGame?.unlockAt ?? GAMES[GAMES.length - 1].unlockAt;
  const progressPercent = Math.min((totalPoints / nextThreshold) * 100, 100);
  const canPlay = totalPoints >= firstGame.unlockAt;

  // Chat-Daten für Floating-Bubble
  const chatData = await fetchChildConversationAction();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Begrüßung */}
      <div className="text-center mb-8 animate-fade-in">
        <p className="text-4xl mb-2 animate-wiggle">👋</p>
        <h1 className="text-3xl font-extrabold text-slate-800">
          Hallo, {displayName}!
        </h1>
        <p className="text-lg text-slate-500 mt-1">Was möchtest du heute machen?</p>
      </div>

      {/* Punkte-Karte */}
      <div className="glass-card rounded-3xl p-6 mb-6 shadow-lg shadow-orange-100/30 animate-fade-in animation-delay-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-slate-500 font-medium">Deine Punkte</p>
            <p className="text-4xl font-extrabold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              {totalPoints}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 font-medium">Aufgaben gelöst</p>
            <p className="text-4xl font-extrabold text-slate-700">{exerciseCount}</p>
          </div>
        </div>

        {/* Progress Bar zum nächsten Spiel */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>
              {nextGame
                ? `Nächstes Spiel: ${nextGame.emoji} ${nextGame.name}`
                : `🎉 Alle ${GAMES.length} Spiele freigeschaltet!`}
            </span>
            <span>
              {totalPoints} / {nextThreshold}
            </span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 via-yellow-400 to-green-400 transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Üben */}
        <Link
          href="/kind/ueben"
          className="glass-card rounded-2xl p-5 text-center hover:scale-[1.03] active:scale-[0.98] transition-all shadow-md hover:shadow-lg animate-fade-in animation-delay-2"
        >
          <span className="text-4xl block mb-2">✏️</span>
          <span className="text-base font-bold text-slate-800">Üben</span>
          <p className="text-xs text-slate-500 mt-1">Mathe-Aufgaben lösen</p>
        </Link>

        {/* Aufgaben vom Lehrer */}
        <Link
          href="/kind/aufgaben"
          className="glass-card rounded-2xl p-5 text-center hover:scale-[1.03] active:scale-[0.98] transition-all shadow-md hover:shadow-lg animate-fade-in animation-delay-3 relative"
        >
          <span className="text-4xl block mb-2">📋</span>
          <span className="text-base font-bold text-slate-800">Aufgaben</span>
          <p className="text-xs text-slate-500 mt-1">Vom Lehrer</p>
          {pendingAssignments > 0 && (
            <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
              {pendingAssignments}
            </span>
          )}
        </Link>

        {/* Nachrichten */}
        <Link
          href="/kind/nachrichten"
          className="glass-card rounded-2xl p-5 text-center hover:scale-[1.03] active:scale-[0.98] transition-all shadow-md hover:shadow-lg animate-fade-in animation-delay-3 relative"
        >
          <span className="text-4xl block mb-2">💌</span>
          <span className="text-base font-bold text-slate-800">Post</span>
          <p className="text-xs text-slate-500 mt-1">Nachrichten</p>
          {(messageCount ?? 0) > 0 && (
            <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
              {messageCount}
            </span>
          )}
        </Link>

        {/* Spiele */}
        {canPlay ? (
          <Link
            href="/kind/spiel"
            className="glass-card rounded-2xl p-5 text-center hover:scale-[1.03] active:scale-[0.98] transition-all shadow-md hover:shadow-lg animate-fade-in animation-delay-4"
          >
            <span className="text-4xl block mb-2 animate-float">🎮</span>
            <span className="text-base font-bold text-slate-800">Spiele</span>
            <p className="text-xs text-green-600 mt-1 font-medium">
              {unlockedCount}/{GAMES.length} frei!
            </p>
          </Link>
        ) : (
          <div className="glass-card rounded-2xl p-5 text-center opacity-50 cursor-not-allowed animate-fade-in animation-delay-4">
            <span className="text-4xl block mb-2 grayscale">🎮</span>
            <span className="text-base font-bold text-slate-400">Spiele</span>
            <p className="text-xs text-slate-400 mt-1">
              Noch {firstGame.unlockAt - totalPoints} Punkte
            </p>
          </div>
        )}
      </div>

      {/* Floating Chat-Bubble */}
      <ChildChat
        initialMessages={chatData.messages ?? []}
        teacherId={chatData.teacherId ?? null}
        teacherName={chatData.teacherName ?? null}
        mode="floating"
        startOpen={false}
      />
    </div>
  );
}
