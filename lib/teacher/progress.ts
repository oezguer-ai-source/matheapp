/**
 * Wiederverwendbare Aggregations-Logik fuer progress_entries im Lehrer-Bereich.
 *
 * PostgREST kann kein GROUP BY, daher wird client-seitig aggregiert. Diese
 * Helfer buendeln die zuvor mehrfach duplizierte Berechnung.
 */

/** Aggregierte Fortschritts-Kennzahlen eines Schuelers. */
export type ProgressStats = {
  points: number;
  total: number;
  correct: number;
  lastAt: string | null;
};

/** Minimal benoetigte Felder einer progress_entries-Zeile fuer die Aggregation. */
export type ProgressEntryRow = {
  child_id?: string;
  correct: boolean | null;
  points_earned: number | null;
  created_at: string | null;
};

/** Leeres Aggregat als Startwert. */
function emptyStats(): ProgressStats {
  return { points: 0, total: 0, correct: 0, lastAt: null };
}

/** Verrechnet eine einzelne Eintrags-Zeile in ein bestehendes Aggregat. */
function accumulate(stats: ProgressStats, entry: ProgressEntryRow): void {
  stats.points += entry.points_earned ?? 0;
  stats.total += 1;
  if (entry.correct) stats.correct += 1;
  if (
    entry.created_at &&
    (!stats.lastAt || entry.created_at > stats.lastAt)
  ) {
    stats.lastAt = entry.created_at;
  }
}

/**
 * Aggregiert progress_entries einer einzelnen Schueler-Liste zu einem
 * Gesamt-Aggregat (ohne Gruppierung nach Kind).
 */
export function aggregateProgress(
  entries: ProgressEntryRow[] | null | undefined
): ProgressStats {
  const stats = emptyStats();
  for (const entry of entries ?? []) {
    accumulate(stats, entry);
  }
  return stats;
}

/**
 * Aggregiert progress_entries mehrerer Kinder und gruppiert das Ergebnis
 * nach child_id.
 */
export function aggregateProgressByChild(
  entries: (ProgressEntryRow & { child_id: string })[] | null | undefined
): Map<string, ProgressStats> {
  const byChild = new Map<string, ProgressStats>();
  for (const entry of entries ?? []) {
    let stats = byChild.get(entry.child_id);
    if (!stats) {
      stats = emptyStats();
      byChild.set(entry.child_id, stats);
    }
    accumulate(stats, entry);
  }
  return byChild;
}

/**
 * Berechnet die Trefferquote in Prozent (ganzzahlig gerundet).
 * Gibt 0 zurueck, wenn keine Aufgaben vorliegen.
 */
export function computeAccuracy(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}
