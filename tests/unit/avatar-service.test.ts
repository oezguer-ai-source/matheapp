import { describe, it, expect, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { recordActivity, defaultSnapshot } from "@/lib/avatar/service";

/**
 * Minimaler Fake-Supabase-Client fuer recordActivity.
 * Er haelt je eine Zeile fuer `avatar_state` und `streak_state` im Speicher
 * und unterstuetzt genau die Query-Kette, die der Service nutzt:
 *   from(table).select(...).eq(...).maybeSingle()
 *   from(table).upsert(row, opts)
 */
function makeFakeSupabase(initial: {
  avatar?: { xp: number; level: number; dino_name: string } | null;
  streak?: {
    current_streak: number;
    best_streak: number;
    last_active_day: string | null;
  } | null;
}) {
  const store: {
    avatar_state: Record<string, unknown> | null;
    streak_state: Record<string, unknown> | null;
  } = {
    avatar_state: initial.avatar ?? null,
    streak_state: initial.streak ?? null,
  };

  function from(table: "avatar_state" | "streak_state") {
    return {
      select() {
        return {
          eq() {
            return {
              async maybeSingle() {
                return { data: store[table], error: null };
              },
            };
          },
        };
      },
      async upsert(row: Record<string, unknown>) {
        store[table] = { ...(store[table] ?? {}), ...row };
        return { error: null };
      },
    };
  }

  return {
    client: { from } as unknown as SupabaseClient<Database>,
    store,
  };
}

describe("defaultSnapshot", () => {
  it("liefert einen frischen Rexi auf Level 1 ohne Streak", () => {
    const snap = defaultSnapshot();
    expect(snap.level).toBe(1);
    expect(snap.xp).toBe(0);
    expect(snap.currentStreak).toBe(0);
    expect(snap.lastActiveDay).toBeNull();
  });
});

describe("recordActivity — Streak-Uebergaenge", () => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = (() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const threeDaysAgo = (() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 3);
    return d.toISOString().slice(0, 10);
  })();

  it("erhoeht die Streak, wenn zuletzt gestern aktiv war (gestern -> heute)", async () => {
    const { client, store } = makeFakeSupabase({
      avatar: { xp: 0, level: 1, dino_name: "Rexi" },
      streak: { current_streak: 3, best_streak: 5, last_active_day: yesterday },
    });

    const result = await recordActivity(client, "kind-1", 10);

    expect(result).not.toBeNull();
    expect(result!.streakIncreased).toBe(true);
    expect(result!.currentStreak).toBe(4);
    expect(store.streak_state).toMatchObject({
      current_streak: 4,
      best_streak: 5,
      last_active_day: today,
    });
  });

  it("setzt die Streak bei einer Tageslucke zurueck auf 1", async () => {
    const { client, store } = makeFakeSupabase({
      avatar: { xp: 0, level: 1, dino_name: "Rexi" },
      streak: {
        current_streak: 7,
        best_streak: 7,
        last_active_day: threeDaysAgo,
      },
    });

    const result = await recordActivity(client, "kind-1", 10);

    expect(result!.currentStreak).toBe(1);
    expect(result!.streakIncreased).toBe(false);
    // best_streak bleibt erhalten
    expect(store.streak_state).toMatchObject({
      current_streak: 1,
      best_streak: 7,
      last_active_day: today,
    });
  });

  it("haelt die Streak konstant bei erneuter Aktivitaet am gleichen Tag", async () => {
    const { client } = makeFakeSupabase({
      avatar: { xp: 0, level: 1, dino_name: "Rexi" },
      streak: { current_streak: 4, best_streak: 6, last_active_day: today },
    });

    const result = await recordActivity(client, "kind-1", 10);

    expect(result!.currentStreak).toBe(4);
    expect(result!.streakIncreased).toBe(false);
  });

  it("startet bei einem Kind ohne bisherige Streak mit 1 (streakIncreased=true)", async () => {
    const { client } = makeFakeSupabase({ avatar: null, streak: null });

    const result = await recordActivity(client, "kind-neu", 10);

    expect(result!.currentStreak).toBe(1);
    expect(result!.streakIncreased).toBe(true);
  });
});

describe("recordActivity — XP & Level", () => {
  it("addiert Punkte zur XP und meldet einen Level-Up", async () => {
    const { client } = makeFakeSupabase({
      avatar: { xp: 45, level: 1, dino_name: "Rexi" },
      streak: null,
    });

    const result = await recordActivity(client, "kind-1", 10);

    expect(result!.xp).toBe(55);
    expect(result!.oldLevel).toBe(1);
    expect(result!.newLevel).toBe(2);
    expect(result!.levelUp).toBe(true);
  });

  it("meldet keinen Level-Up, wenn die Schwelle nicht erreicht wird", async () => {
    const { client } = makeFakeSupabase({
      avatar: { xp: 10, level: 1, dino_name: "Rexi" },
      streak: null,
    });

    const result = await recordActivity(client, "kind-1", 10);

    expect(result!.xp).toBe(20);
    expect(result!.levelUp).toBe(false);
  });

  it("ignoriert negative Punkte (kein XP-Verlust)", async () => {
    const { client } = makeFakeSupabase({
      avatar: { xp: 100, level: 3, dino_name: "Rexi" },
      streak: null,
    });

    const result = await recordActivity(client, "kind-1", -50);

    expect(result!.xp).toBe(100);
  });
});
