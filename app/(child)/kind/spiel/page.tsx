import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GAMES } from "@/lib/config/games";
import { ClassLeaderboard } from "@/components/child/class-leaderboard";

export const metadata: Metadata = {
  title: "Matheapp — Spiele",
};

export default async function SpielHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("class_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: entries } = await supabase
    .from("progress_entries")
    .select("points_earned")
    .eq("child_id", user.id);

  const totalPoints = (entries ?? []).reduce(
    (sum, e) => sum + (e.points_earned ?? 0),
    0
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="text-center mb-8 animate-fade-in">
        <p className="text-5xl mb-2 animate-wiggle">🎮</p>
        <h1 className="text-3xl font-extrabold text-slate-800">Deine Spiele</h1>
        <p className="text-lg text-slate-500 mt-1">
          Sammle Punkte — schalte neue Spiele frei!
        </p>
      </div>

      <div className="glass-card rounded-3xl p-5 mb-6 text-center shadow-lg shadow-orange-100/30 animate-fade-in">
        <p className="text-sm text-slate-500 font-medium">Deine Punkte</p>
        <p className="text-5xl font-extrabold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
          {totalPoints}
        </p>
      </div>

      <div className="grid gap-5">
        {GAMES.map((game, i) => {
          const unlocked = totalPoints >= game.unlockAt;
          const pointsNeeded = Math.max(game.unlockAt - totalPoints, 0);

          const card = (
            <div
              className={`glass-card rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all animate-fade-in`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className={`bg-gradient-to-br ${game.color} p-5 text-white flex items-center gap-4 ${
                  unlocked ? "" : "opacity-50 grayscale"
                }`}
              >
                <span className="text-6xl">{game.emoji}</span>
                <div className="flex-1">
                  <h2 className="text-2xl font-extrabold">{game.name}</h2>
                  <p className="text-sm opacity-90">{game.description}</p>
                </div>
                {unlocked ? (
                  <span className="text-sm font-bold bg-white/30 rounded-full px-3 py-1">
                    Spielen →
                  </span>
                ) : (
                  <span className="text-sm font-bold bg-white/30 rounded-full px-3 py-1">
                    🔒 {pointsNeeded} Pkt.
                  </span>
                )}
              </div>

              <div className="p-4">
                {unlocked ? (
                  <ClassLeaderboard
                    gameKey={game.key}
                    classId={profile?.class_id ?? null}
                    currentUserId={user.id}
                    scoreUnit={game.scoreUnit}
                  />
                ) : (
                  <p className="text-center text-sm text-slate-400 py-3">
                    Sammle noch <b>{pointsNeeded}</b> Punkte, um freizuschalten.
                  </p>
                )}
              </div>
            </div>
          );

          return unlocked ? (
            <Link key={game.key} href={game.route}>
              {card}
            </Link>
          ) : (
            <div key={game.key} aria-disabled="true">
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
