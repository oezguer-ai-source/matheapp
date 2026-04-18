/**
 * Relative Datumsformatierung auf Deutsch und Inaktivitaets-Check.
 *
 * Vergleich basiert auf Kalender-Tagen (Start of Day), nicht 24h-Perioden.
 */

/**
 * Formatiert ein ISO-Datum als relatives deutsches Datum.
 *
 * - null -> "Keine Aktivitaet"
 * - Heute -> "Heute"
 * - Gestern -> "Gestern"
 * - 2-30 Tage -> "vor X Tagen"
 * - Aelter als 30 Tage -> "TT.MM.JJJJ"
 */
export function formatRelativeDate(isoDate: string | null): string {
  if (!isoDate) return "Keine Aktivitaet";

  const date = new Date(isoDate);
  const now = new Date();

  // Start of day fuer beide Daten (lokale Zeitzone)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffMs = startOfToday.getTime() - startOfDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Heute";
  if (diffDays === 1) return "Gestern";
  if (diffDays >= 2 && diffDays <= 30) return `vor ${diffDays} Tagen`;

  // Aelter als 30 Tage -> deutsches Datum
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Prueft ob ein Kind inaktiv ist (keine Aktivitaet oder letzte Aktivitaet > 7 Tage).
 * Wird fuer die visuelle Hervorhebung in der Tabelle verwendet.
 */
export function isInactive(isoDate: string | null): boolean {
  if (!isoDate) return true;

  const date = new Date(isoDate);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffMs = startOfToday.getTime() - startOfDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 7;
}
