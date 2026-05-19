import { describe, it, expect } from "vitest";
import { verifyStudentDeletion } from "@/lib/teacher/student-deletion";

/**
 * Unit-Tests fuer die Ownership-Pruefung von deleteStudentAction.
 *
 * Geprueft wird die reine, aus der Server-Action extrahierte Logik:
 *   1. Die Klasse muss dem aufrufenden Lehrer gehoeren.
 *   2. Der Schueler muss role='child' haben UND in genau dieser Klasse sein.
 */

const TEACHER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_TEACHER_ID = "22222222-2222-2222-2222-222222222222";
const CLASS_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_CLASS_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("verifyStudentDeletion — Ownership-Pruefung", () => {
  it("erlaubt das Loeschen, wenn Klasse dem Lehrer gehoert und Schueler in der Klasse ist", () => {
    const result = verifyStudentDeletion({
      teacherClass: { teacher_id: TEACHER_ID },
      studentProfile: { role: "child", class_id: CLASS_ID },
      teacherId: TEACHER_ID,
      classId: CLASS_ID,
    });
    expect(result.ok).toBe(true);
  });

  it("lehnt ab, wenn die Klasse nicht existiert", () => {
    const result = verifyStudentDeletion({
      teacherClass: null,
      studentProfile: { role: "child", class_id: CLASS_ID },
      teacherId: TEACHER_ID,
      classId: CLASS_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Klasse nicht gefunden.");
  });

  it("lehnt ab, wenn die Klasse einem anderen Lehrer gehoert", () => {
    const result = verifyStudentDeletion({
      teacherClass: { teacher_id: OTHER_TEACHER_ID },
      studentProfile: { role: "child", class_id: CLASS_ID },
      teacherId: TEACHER_ID,
      classId: CLASS_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Klasse nicht gefunden.");
  });

  it("lehnt ab, wenn der Schueler kein profiles-Eintrag hat", () => {
    const result = verifyStudentDeletion({
      teacherClass: { teacher_id: TEACHER_ID },
      studentProfile: null,
      teacherId: TEACHER_ID,
      classId: CLASS_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toBe("Schüler nicht in dieser Klasse gefunden.");
  });

  it("lehnt ab, wenn das Ziel-Profil kein Kind ist (z.B. ein Lehrer)", () => {
    const result = verifyStudentDeletion({
      teacherClass: { teacher_id: TEACHER_ID },
      studentProfile: { role: "teacher", class_id: CLASS_ID },
      teacherId: TEACHER_ID,
      classId: CLASS_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toBe("Schüler nicht in dieser Klasse gefunden.");
  });

  it("lehnt ab, wenn der Schueler in einer anderen Klasse ist", () => {
    const result = verifyStudentDeletion({
      teacherClass: { teacher_id: TEACHER_ID },
      studentProfile: { role: "child", class_id: OTHER_CLASS_ID },
      teacherId: TEACHER_ID,
      classId: CLASS_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toBe("Schüler nicht in dieser Klasse gefunden.");
  });

  it("lehnt ab, wenn der Schueler keiner Klasse zugeordnet ist", () => {
    const result = verifyStudentDeletion({
      teacherClass: { teacher_id: TEACHER_ID },
      studentProfile: { role: "child", class_id: null },
      teacherId: TEACHER_ID,
      classId: CLASS_ID,
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toBe("Schüler nicht in dieser Klasse gefunden.");
  });
});
