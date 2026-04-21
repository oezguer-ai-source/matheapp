import { createClient } from "@/lib/supabase/server";

interface Props {
  gameKey: string;
  classId: string | null;
  currentUserId: string;
  scoreUnit: string;
  limit?: number;
}

export async function ClassLeaderboard({
  gameKey,
  classId,
  currentUserId,
  scoreUnit,
  limit = 5,
}: Props) {
  if (!classId) {
    return (
      <p className="text-center text-sm text-slate-400 py-3">
        Noch keiner Klasse zugeordnet — Ranking kommt später.
      </p>
    );
  }

  const supabase = await createClient();

  const { data: scores, error } = await supabase
    .from("game_scores")
    .select("child_id, score")
    .eq("class_id", classId)
    .eq("game_key", gameKey)
    .order("score", { ascending: false });

  if (error) {
    return (
      <p className="text-center text-xs text-slate-400 py-3">
        Ranking gerade nicht verfügbar.
      </p>
    );
  }

  const bestByChild = new Map<string, number>();
  for (const row of scores ?? []) {
    const current = bestByChild.get(row.child_id) ?? 0;
    if (row.score > current) bestByChild.set(row.child_id, row.score);
  }

  const childIds = Array.from(bestByChild.keys());
  let nameByChild = new Map<string, string>();
  if (childIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", childIds);
    nameByChild = new Map(
      (profiles ?? []).map((p) => [p.user_id, prettyName(p.display_name)])
    );
  }

  const ranking = Array.from(bestByChild.entries())
    .map(([childId, score]) => ({
      childId,
      score,
      name: nameByChild.get(childId) ?? "Mitschüler",
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (ranking.length === 0) {
    return (
      <p className="text-center text-sm text-slate-400 py-3">
        Noch kein Highscore — sei der/die Erste!
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
        🏆 Klassen-Rangliste
      </p>
      <ol className="space-y-1">
        {ranking.map((r, i) => {
          const isMe = r.childId === currentUserId;
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          return (
            <li
              key={r.childId}
              className={`flex items-center justify-between text-sm rounded-lg px-3 py-1.5 ${
                isMe
                  ? "bg-orange-100 text-orange-900 font-bold"
                  : "text-slate-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-6 text-center">{medal}</span>
                <span>{isMe ? `${r.name} (du)` : r.name}</span>
              </span>
              <span className="font-mono font-bold">
                {r.score} {scoreUnit}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function prettyName(raw: string): string {
  return raw
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
