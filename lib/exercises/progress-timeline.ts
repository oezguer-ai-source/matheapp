/**
 * Reiner Helfer, der progress_entries nach ISO-Kalenderwoche bucketisiert.
 *
 * Verwendet fuer die Eltern-Bericht-Seite im Kinder-Bereich. Die Aggregation
 * laeuft client-seitig (PostgREST kann kein GROUP BY) — analog zu
 * lib/teacher/progress.ts.
 *
 * Zeitzonensicher: Alle Datumsberechnungen erfolgen in UTC, konsistent zu
 * lib/avatar/service.ts.
 */

/** Minimal benoetigte Felder einer progress_entries-Zeile. */
export type TimelineEntryRow = {
  correct: boolean | null;
  points_earned: number | null;
  created_at: string | null;
};

/** Aggregat einer einzelnen ISO-Woche. */
export type WeekBucket = {
  /** ISO-Wochen-Kennung im Format "2026-W21". */
  week: string;
  /** Menschenlesbares Label, z.B. "12.05.". (Montag der Woche) */
  label: string;
  /** Anzahl geloester Aufgaben in dieser Woche. */
  exercises: number;
  /** Anzahl korrekt geloester Aufgaben. */
  correct: number;
  /** Summe der erreichten Punkte. */
  points: number;
};

/** Anzahl Wochen, die der Verlauf zurueckreicht (inkl. aktueller Woche). */
const TIMELINE_WEEKS = 8;

/** Millisekunden pro Tag. */
const MS_PER_DAY = 86_400_000;

/**
 * Liefert den Montag (00:00 UTC) der ISO-Woche, in der `date` liegt.
 * ISO-Wochen beginnen am Montag.
 */
function isoWeekStartUTC(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  // getUTCDay(): 0 = Sonntag .. 6 = Samstag. ISO: Montag = 0.
  const isoDay = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - isoDay);
  return d;
}

/**
 * Berechnet die ISO-Wochen-Kennung ("YYYY-Wnn") fuer ein Datum.
 */
function isoWeekKey(date: Date): string {
  // Donnerstag der Woche bestimmt das ISO-Jahr.
  const monday = isoWeekStartUTC(date);
  const thursday = new Date(monday.getTime() + 3 * MS_PER_DAY);
  const isoYear = thursday.getUTCFullYear();

  // Erster Donnerstag des ISO-Jahres.
  const jan1 = new Date(Date.UTC(isoYear, 0, 1));
  const jan1IsoDay = (jan1.getUTCDay() + 6) % 7;
  const firstThursday = new Date(
    jan1.getTime() + ((3 - jan1IsoDay + 7) % 7) * MS_PER_DAY
  );

  const weekNo =
    1 +
    Math.round(
      (thursday.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY)
    );

  return `${isoYear}-W${String(weekNo).padStart(2, "0")}`;
}

/** Label "TT.MM." aus dem Montag der Woche. */
function weekLabel(monday: Date): string {
  const dd = String(monday.getUTCDate()).padStart(2, "0");
  const mm = String(monday.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.`;
}

/**
 * Bucketisiert progress_entries in die letzten `TIMELINE_WEEKS` ISO-Wochen.
 *
 * Es werden immer genau `TIMELINE_WEEKS` Buckets zurueckgegeben (chronologisch,
 * aelteste zuerst) — auch leere Wochen, damit die Balken-Darstellung eine
 * konstante Achse hat. Eintraege ausserhalb des Fensters werden ignoriert.
 *
 * @param entries  progress_entries-Zeilen (z.B. ohne minigame_redeem gefiltert)
 * @param now      Referenzzeitpunkt (default: jetzt) — testbar machbar
 */
export function buildProgressTimeline(
  entries: TimelineEntryRow[] | null | undefined,
  now: Date = new Date()
): WeekBucket[] {
  // Wochen-Geruest aufbauen (aelteste zuerst).
  const currentMonday = isoWeekStartUTC(now);
  const buckets = new Map<string, WeekBucket>();
  const order: string[] = [];

  for (let i = TIMELINE_WEEKS - 1; i >= 0; i--) {
    const monday = new Date(currentMonday.getTime() - i * 7 * MS_PER_DAY);
    const key = isoWeekKey(monday);
    order.push(key);
    buckets.set(key, {
      week: key,
      label: weekLabel(monday),
      exercises: 0,
      correct: 0,
      points: 0,
    });
  }

  for (const entry of entries ?? []) {
    if (!entry.created_at) continue;
    const date = new Date(entry.created_at);
    if (Number.isNaN(date.getTime())) continue;

    const key = isoWeekKey(date);
    const bucket = buckets.get(key);
    if (!bucket) continue; // ausserhalb des 8-Wochen-Fensters

    bucket.exercises += 1;
    if (entry.correct) bucket.correct += 1;
    bucket.points += entry.points_earned ?? 0;
  }

  return order.map((key) => buckets.get(key)!);
}
