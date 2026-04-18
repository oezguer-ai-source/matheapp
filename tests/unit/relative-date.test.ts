import { describe, it, expect } from "vitest";
import { formatRelativeDate, isInactive } from "@/lib/utils/relative-date";

/**
 * Erzeugt einen ISO-Datumstring fuer "heute minus N Tage".
 * Setzt die Uhrzeit auf Mittag, um Randprobleme mit Start-of-Day zu vermeiden.
 */
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};

describe("formatRelativeDate", () => {
  it("gibt 'Keine Aktivitaet' fuer null zurueck", () => {
    expect(formatRelativeDate(null)).toBe("Keine Aktivitaet");
  });

  it("gibt 'Heute' fuer ein Datum von heute zurueck", () => {
    const today = daysAgo(0);
    expect(formatRelativeDate(today)).toBe("Heute");
  });

  it("gibt 'Gestern' fuer ein Datum von gestern zurueck", () => {
    const yesterday = daysAgo(1);
    expect(formatRelativeDate(yesterday)).toBe("Gestern");
  });

  it("gibt 'vor 3 Tagen' fuer ein Datum vor 3 Tagen zurueck", () => {
    const threeDaysAgo = daysAgo(3);
    expect(formatRelativeDate(threeDaysAgo)).toBe("vor 3 Tagen");
  });

  it("gibt 'vor 7 Tagen' fuer ein Datum vor 7 Tagen zurueck", () => {
    const sevenDaysAgo = daysAgo(7);
    expect(formatRelativeDate(sevenDaysAgo)).toBe("vor 7 Tagen");
  });

  it("gibt 'vor 30 Tagen' fuer ein Datum vor 30 Tagen zurueck", () => {
    const thirtyDaysAgo = daysAgo(30);
    expect(formatRelativeDate(thirtyDaysAgo)).toBe("vor 30 Tagen");
  });

  it("gibt deutsches Datum TT.MM.JJJJ fuer ein Datum aelter als 30 Tage zurueck", () => {
    const oldDate = daysAgo(31);
    const result = formatRelativeDate(oldDate);
    // Muss im Format TT.MM.JJJJ sein
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);

    // Pruefe, dass das Datum korrekt ist
    const d = new Date();
    d.setDate(d.getDate() - 31);
    const expectedDay = String(d.getDate()).padStart(2, "0");
    const expectedMonth = String(d.getMonth() + 1).padStart(2, "0");
    const expectedYear = d.getFullYear();
    expect(result).toBe(`${expectedDay}.${expectedMonth}.${expectedYear}`);
  });
});

describe("isInactive", () => {
  it("gibt true fuer null zurueck (keine Aktivitaet)", () => {
    expect(isInactive(null)).toBe(true);
  });

  it("gibt false fuer ein Datum von heute zurueck", () => {
    expect(isInactive(daysAgo(0))).toBe(false);
  });

  it("gibt false fuer ein Datum vor 6 Tagen zurueck", () => {
    expect(isInactive(daysAgo(6))).toBe(false);
  });

  it("gibt false fuer ein Datum vor genau 7 Tagen zurueck (Grenzwert)", () => {
    // 7 Tage ist noch nicht inaktiv (> 7, nicht >= 7)
    expect(isInactive(daysAgo(7))).toBe(false);
  });

  it("gibt true fuer ein Datum vor 8 Tagen zurueck", () => {
    expect(isInactive(daysAgo(8))).toBe(true);
  });
});
