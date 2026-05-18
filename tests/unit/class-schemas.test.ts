import { describe, it, expect } from "vitest";
import {
  classGradeSchema,
  createClassSchema,
  setClassGradeSchema,
} from "@/lib/schemas/class";

/**
 * Unit-Tests fuer die Klassen-Schemas (Bug-3-Fix).
 *
 * Hintergrund: Die Klassenstufe wurde frueher per Regex /^(\d)/ aus dem
 * Klassennamen geraten — "Klasse 4" begann mit "K", kein Treffer, stiller
 * Default 1. Jetzt ist die Stufe ein eigenes Pflichtfeld (1-4).
 */

describe("classGradeSchema", () => {
  it("akzeptiert die Stufen 1 bis 4", () => {
    for (const g of [1, 2, 3, 4]) {
      expect(classGradeSchema.safeParse(g).success).toBe(true);
    }
  });

  it("coerced Strings aus FormData", () => {
    const res = classGradeSchema.safeParse("4");
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toBe(4);
  });

  it("lehnt Stufen ausserhalb 1-4 ab", () => {
    expect(classGradeSchema.safeParse(0).success).toBe(false);
    expect(classGradeSchema.safeParse(5).success).toBe(false);
  });

  it("lehnt nicht-ganzzahlige und leere Eingaben ab", () => {
    expect(classGradeSchema.safeParse(2.5).success).toBe(false);
    expect(classGradeSchema.safeParse("").success).toBe(false);
    expect(classGradeSchema.safeParse(null).success).toBe(false);
  });
});

describe("createClassSchema", () => {
  it("verlangt Name UND Klassenstufe", () => {
    expect(
      createClassSchema.safeParse({ className: "4a", grade: "4" }).success
    ).toBe(true);
    // Kein grade -> ungueltig (frueher stiller Default)
    expect(
      createClassSchema.safeParse({ className: "4a" }).success
    ).toBe(false);
  });

  it("akzeptiert 'Klasse 4' korrekt mit expliziter Stufe", () => {
    // Genau der Fall, der mit der alten Regex fehlschlug.
    const res = createClassSchema.safeParse({
      className: "Klasse 4",
      grade: "4",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.grade).toBe(4);
  });
});

describe("setClassGradeSchema", () => {
  it("verlangt eine gueltige classId (uuid) und Stufe", () => {
    expect(
      setClassGradeSchema.safeParse({
        classId: "11111111-1111-4111-8111-111111111111",
        grade: "2",
      }).success
    ).toBe(true);
    expect(
      setClassGradeSchema.safeParse({ classId: "keine-uuid", grade: "2" })
        .success
    ).toBe(false);
  });
});
