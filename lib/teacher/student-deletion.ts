/**
 * Reine Ownership-Pruefung fuer das Loeschen eines Schuelers.
 *
 * Bewusst in ein eigenes Modul (ohne "use server") ausgelagert, damit die
 * Logik synchron, ohne Next-Runtime und ohne Server-Action-Beschraenkungen
 * testbar ist.
 *
 * Bedingungen:
 *   1. Die Klasse muss dem Lehrer gehoeren (classes.teacher_id == teacherId).
 *   2. Der Schueler muss ein profiles-Eintrag mit role='child' und
 *      class_id == classId sein.
 */
export function verifyStudentDeletion(args: {
  teacherClass: { teacher_id: string } | null;
  studentProfile: { role: string; class_id: string | null } | null;
  teacherId: string;
  classId: string;
}): { ok: true } | { ok: false; error: string } {
  const { teacherClass, studentProfile, teacherId, classId } = args;

  if (!teacherClass || teacherClass.teacher_id !== teacherId) {
    return { ok: false, error: "Klasse nicht gefunden." };
  }

  if (
    !studentProfile ||
    studentProfile.role !== "child" ||
    studentProfile.class_id !== classId
  ) {
    return { ok: false, error: "Schüler nicht in dieser Klasse gefunden." };
  }

  return { ok: true };
}
