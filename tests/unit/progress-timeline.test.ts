import { describe, it, expect } from "vitest";
import {
  buildProgressTimeline,
  type TimelineEntryRow,
} from "@/lib/exercises/progress-timeline";

/** Fester Referenzzeitpunkt: Montag, 18.05.2026, 12:00 UTC (ISO-Woche 2026-W21). */
const NOW = new Date("2026-05-18T12:00:00Z");

function entry(
  createdAt: string,
  correct = true,
  points = 10
): TimelineEntryRow {
  return { created_at: createdAt, correct, points_earned: points };
}

describe("buildProgressTimeline", () => {
  it("liefert immer genau 8 Wochen-Buckets, chronologisch sortiert", () => {
    const timeline = buildProgressTimeline([], NOW);
    expect(timeline).toHaveLength(8);
    // Aelteste zuerst, aktuelle Woche zuletzt.
    expect(timeline[7].week).toBe("2026-W21");
    expect(timeline[0].week).toBe("2026-W14");
  });

  it("ordnet Eintraege der korrekten ISO-Woche zu", () => {
    const timeline = buildProgressTimeline(
      [
        entry("2026-05-18T08:00:00Z"), // aktuelle Woche W21
        entry("2026-05-12T10:00:00Z"), // Vorwoche W20 (Dienstag)
        entry("2026-05-11T23:59:00Z"), // Vorwoche W20 (Montag spaet)
      ],
      NOW
    );
    const w21 = timeline.find((b) => b.week === "2026-W21")!;
    const w20 = timeline.find((b) => b.week === "2026-W20")!;
    expect(w21.exercises).toBe(1);
    expect(w20.exercises).toBe(2);
  });

  it("zaehlt korrekte Aufgaben und summiert Punkte pro Woche", () => {
    const timeline = buildProgressTimeline(
      [
        entry("2026-05-18T08:00:00Z", true, 30),
        entry("2026-05-19T08:00:00Z", false, 0),
        entry("2026-05-20T08:00:00Z", true, 20),
      ],
      NOW
    );
    const w21 = timeline.find((b) => b.week === "2026-W21")!;
    expect(w21.exercises).toBe(3);
    expect(w21.correct).toBe(2);
    expect(w21.points).toBe(50);
  });

  it("ignoriert Eintraege ausserhalb des 8-Wochen-Fensters", () => {
    const timeline = buildProgressTimeline(
      [
        entry("2026-03-01T08:00:00Z"), // weit vor W14
        entry("2027-01-01T08:00:00Z"), // in der Zukunft
      ],
      NOW
    );
    const total = timeline.reduce((s, b) => s + b.exercises, 0);
    expect(total).toBe(0);
  });

  it("ignoriert Eintraege ohne oder mit ungueltigem created_at", () => {
    const timeline = buildProgressTimeline(
      [
        { created_at: null, correct: true, points_earned: 10 },
        { created_at: "kein-datum", correct: true, points_earned: 10 },
      ],
      NOW
    );
    const total = timeline.reduce((s, b) => s + b.exercises, 0);
    expect(total).toBe(0);
  });

  it("behandelt Sonntag korrekt als Ende der ISO-Woche", () => {
    // Sonntag 17.05.2026 gehoert noch zu W20, Montag 18.05. zu W21.
    const timeline = buildProgressTimeline(
      [
        entry("2026-05-17T23:00:00Z"), // Sonntag -> W20
        entry("2026-05-18T01:00:00Z"), // Montag  -> W21
      ],
      NOW
    );
    expect(timeline.find((b) => b.week === "2026-W20")!.exercises).toBe(1);
    expect(timeline.find((b) => b.week === "2026-W21")!.exercises).toBe(1);
  });

  it("ist zeitzonensicher: aggregiert in UTC unabhaengig von lokaler TZ", () => {
    // Ein Eintrag knapp nach UTC-Mitternacht am Montag bleibt in W21.
    const timeline = buildProgressTimeline(
      [entry("2026-05-18T00:30:00Z")],
      NOW
    );
    expect(timeline.find((b) => b.week === "2026-W21")!.exercises).toBe(1);
  });

  it("erzeugt menschenlesbare Labels im Format TT.MM.", () => {
    const timeline = buildProgressTimeline([], NOW);
    expect(timeline[7].label).toBe("18.05.");
    expect(timeline[6].label).toBe("11.05.");
  });

  it("behandelt null/undefined als leere Liste", () => {
    expect(buildProgressTimeline(null, NOW)).toHaveLength(8);
    expect(buildProgressTimeline(undefined, NOW)).toHaveLength(8);
  });
});
