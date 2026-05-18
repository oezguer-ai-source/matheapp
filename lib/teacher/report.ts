/**
 * Aggregations- und Empfehlungs-Helfer fuer den Lehrer-Bereich.
 *
 * Buendelt die zuvor inline in app/(teacher)/lehrer/klasse/[id]/page.tsx
 * liegende Klassen-Aggregations-/Warn-Logik, damit sowohl die Klassen-Seite
 * als auch die druckbaren Berichte dieselbe Quelle nutzen (kein Duplikat).
 *
 * Reine Funktionen ohne DB-Zugriff — testbar und in Server-Components nutzbar.
 */

import type { ProgressStats } from "@/lib/teacher/progress";
import { computeAccuracy } from "@/lib/teacher/progress";
import type { WeekBucket } from "@/lib/exercises/progress-timeline";
import { formatName } from "@/lib/teacher/format";

// ============================================================
// Warn-Logik (Risiko-Erkennung)
// ============================================================

/** Schwellwerte fuer die Warn-Erkennung. */
const INACTIVE_DAYS = 5;
const LOW_ACCURACY_PCT = 40;
const LOW_ACCURACY_MIN_EXERCISES = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Warn-Flags eines einzelnen Schuelers. */
export type StudentWarn = {
  /** Lange nicht geuebt (>= INACTIVE_DAYS Tage seit letzter Aktivitaet). */
  inactive: boolean;
  /** Niedrige Trefferquote (< LOW_ACCURACY_PCT% bei genug Aufgaben). */
  lowAccuracy: boolean;
  /** Noch nie aktiv gewesen. */
  neverActive: boolean;
};

/**
 * Berechnet die Warn-Flags eines Schuelers aus seinem Fortschritts-Aggregat.
 *
 * @param stats  Aggregat des Schuelers (oder undefined, wenn nie aktiv)
 * @param now    Referenzzeitpunkt (default: jetzt) — testbar machbar
 */
export function computeStudentWarn(
  stats: ProgressStats | undefined,
  now: Date = new Date()
): StudentWarn {
  const lastMs = stats?.lastAt ? new Date(stats.lastAt).getTime() : 0;
  const daysSince = lastMs ? (now.getTime() - lastMs) / MS_PER_DAY : Infinity;
  const total = stats?.total ?? 0;
  const accuracy = total > 0 ? computeAccuracy(stats!.correct, total) : null;

  return {
    inactive: lastMs > 0 && daysSince >= INACTIVE_DAYS,
    lowAccuracy:
      total >= LOW_ACCURACY_MIN_EXERCISES && (accuracy ?? 100) < LOW_ACCURACY_PCT,
    neverActive: !lastMs,
  };
}

/** True, wenn mindestens ein Warn-Flag gesetzt ist. */
export function hasWarn(warn: StudentWarn): boolean {
  return warn.inactive || warn.lowAccuracy || warn.neverActive;
}

/** Anzahl gesetzter Warn-Flags (fuer Sortier-Gewichtung). */
export function warnWeight(warn: StudentWarn): number {
  return (
    (warn.inactive ? 1 : 0) +
    (warn.lowAccuracy ? 1 : 0) +
    (warn.neverActive ? 1 : 0)
  );
}

/** Tage seit der letzten Aktivitaet (oder null, wenn nie aktiv). */
export function daysInactive(
  stats: ProgressStats | undefined,
  now: Date = new Date()
): number | null {
  if (!stats?.lastAt) return null;
  return Math.floor(
    (now.getTime() - new Date(stats.lastAt).getTime()) / MS_PER_DAY
  );
}

// ============================================================
// Rechenart-Genauigkeit
// ============================================================

/** Die vier unterstuetzten Rechenarten. */
export const OPERATION_TYPES = [
  "addition",
  "subtraktion",
  "multiplikation",
  "division",
] as const;

export type OperationType = (typeof OPERATION_TYPES)[number];

/** Deutsche Anzeige-Labels pro Rechenart. */
export const OPERATION_LABELS: Record<OperationType, string> = {
  addition: "Addition",
  subtraktion: "Subtraktion",
  multiplikation: "Multiplikation",
  division: "Division",
};

/** Genauigkeit einer einzelnen Rechenart. */
export type OperationAccuracyStat = {
  operation: OperationType;
  label: string;
  total: number;
  correct: number;
  accuracy: number; // 0-100
};

/** Minimal benoetigte Felder einer progress_entries-Zeile pro Rechenart. */
export type OperationEntryRow = {
  operation_type: string;
  correct: boolean | null;
};

/**
 * Aggregiert progress_entries nach Rechenart. Gibt immer alle vier
 * Rechenarten zurueck (auch mit total=0).
 */
export function aggregateOperationAccuracy(
  entries: OperationEntryRow[] | null | undefined
): OperationAccuracyStat[] {
  const grouped = new Map<string, { total: number; correct: number }>();
  for (const entry of entries ?? []) {
    const existing = grouped.get(entry.operation_type) ?? {
      total: 0,
      correct: 0,
    };
    existing.total += 1;
    if (entry.correct) existing.correct += 1;
    grouped.set(entry.operation_type, existing);
  }

  return OPERATION_TYPES.map((operation) => {
    const stats = grouped.get(operation);
    const total = stats?.total ?? 0;
    const correct = stats?.correct ?? 0;
    return {
      operation,
      label: OPERATION_LABELS[operation],
      total,
      correct,
      accuracy: computeAccuracy(correct, total),
    };
  });
}

/**
 * Ermittelt die schwaechste Rechenart mit aussagekraeftiger Datenbasis.
 *
 * "Aussagekraeftig" bedeutet mindestens MIN_OP_EXERCISES geloeste Aufgaben —
 * eine Rechenart mit 1 Aufgabe und 0% soll keine Empfehlung ausloesen.
 * Gibt null zurueck, wenn keine Rechenart genug Daten hat.
 */
const MIN_OP_EXERCISES = 5;

export function weakestOperation(
  stats: OperationAccuracyStat[]
): OperationAccuracyStat | null {
  const relevant = stats.filter((s) => s.total >= MIN_OP_EXERCISES);
  if (relevant.length === 0) return null;
  return relevant.reduce((min, s) => (s.accuracy < min.accuracy ? s : min));
}

// ============================================================
// Aufgaben-Status (Lehrer-Aufgaben / Assignments)
// ============================================================

/** Status einer Schueler-Abgabe relativ zu einer Aufgabe. */
export type AssignmentStatusKey =
  | "submitted" // abgegeben
  | "in_progress" // begonnen, nicht abgegeben
  | "overdue" // Deadline verstrichen, nicht abgegeben
  | "open"; // noch offen, Deadline in der Zukunft

/** Deutsche Labels pro Aufgaben-Status. */
export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatusKey, string> = {
  submitted: "Abgegeben",
  in_progress: "In Bearbeitung",
  overdue: "Ueberfaellig",
  open: "Offen",
};

/** Minimal benoetigte Felder einer Aufgabe. */
export type AssignmentRow = {
  id: string;
  title: string;
  due_date: string;
};

/** Minimal benoetigte Felder einer Abgabe. */
export type SubmissionRow = {
  assignment_id: string;
  student_id: string;
  status: string;
  submitted_at: string | null;
};

/** Aufgaben-Status eines Schuelers fuer eine konkrete Aufgabe. */
export type StudentAssignmentStatus = {
  assignmentId: string;
  title: string;
  dueDate: string;
  status: AssignmentStatusKey;
};

/**
 * Bestimmt den Aufgaben-Status eines Schuelers fuer eine Aufgabe.
 */
function resolveAssignmentStatus(
  assignment: AssignmentRow,
  submission: SubmissionRow | undefined,
  now: Date
): AssignmentStatusKey {
  if (submission?.status === "submitted") return "submitted";
  const overdue = new Date(assignment.due_date).getTime() < now.getTime();
  if (submission?.status === "in_progress") {
    return overdue ? "overdue" : "in_progress";
  }
  return overdue ? "overdue" : "open";
}

// ============================================================
// Schueler-Bericht
// ============================================================

/** Vollstaendiger, druckbarer Bericht eines einzelnen Schuelers. */
export type StudentReport = {
  /** Roh-Anzeigename (Benutzername, z.B. "max.mustermann"). */
  username: string;
  /** Aufbereiteter Klarname (z.B. "Max Mustermann"). */
  displayName: string;
  className: string;
  /** Gesamt-Aggregat (Punkte, Aufgaben, korrekt, letzte Aktivitaet). */
  stats: ProgressStats;
  /** Gesamt-Trefferquote in Prozent. */
  accuracy: number;
  /** Genauigkeit pro Rechenart. */
  operations: OperationAccuracyStat[];
  /** Schwaechste Rechenart (oder null bei zu wenig Daten). */
  weakest: OperationAccuracyStat | null;
  /** Warn-Flags. */
  warn: StudentWarn;
  /** Tage seit letzter Aktivitaet (null = nie aktiv). */
  inactiveDays: number | null;
  /** Aktueller Streak. */
  streak: number;
  /** Status der Lehrer-Aufgaben. */
  assignments: StudentAssignmentStatus[];
  /** Wochen-Verlauf (8 Wochen). */
  timeline: WeekBucket[];
  /** Handlungsempfehlungen ("wo ansetzen"). */
  recommendations: string[];
};

/** Eingabeparameter fuer buildStudentReport. */
export type BuildStudentReportInput = {
  username: string;
  className: string;
  stats: ProgressStats;
  operationEntries: OperationEntryRow[] | null | undefined;
  streak: number;
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
  timeline: WeekBucket[];
  now?: Date;
};

/**
 * Baut den vollstaendigen Schueler-Bericht inkl. Handlungsempfehlungen.
 */
export function buildStudentReport(
  input: BuildStudentReportInput
): StudentReport {
  const now = input.now ?? new Date();

  const accuracy = computeAccuracy(input.stats.correct, input.stats.total);
  const operations = aggregateOperationAccuracy(input.operationEntries);
  const weakest = weakestOperation(operations);
  const warn = computeStudentWarn(input.stats, now);
  const inactiveDays = daysInactive(input.stats, now);

  const assignments: StudentAssignmentStatus[] = input.assignments.map((a) => {
    const submission = input.submissions.find(
      (s) => s.assignment_id === a.id
    );
    return {
      assignmentId: a.id,
      title: a.title,
      dueDate: a.due_date,
      status: resolveAssignmentStatus(a, submission, now),
    };
  });

  return {
    username: input.username,
    displayName: formatName(input.username),
    className: input.className,
    stats: input.stats,
    accuracy,
    operations,
    weakest,
    warn,
    inactiveDays,
    streak: input.streak,
    assignments,
    timeline: input.timeline,
    recommendations: buildStudentRecommendations({
      stats: input.stats,
      accuracy,
      weakest,
      warn,
      inactiveDays,
      assignments,
    }),
  };
}

/**
 * Leitet konkrete Handlungsempfehlungen fuer einen Schueler ab.
 */
function buildStudentRecommendations(args: {
  stats: ProgressStats;
  accuracy: number;
  weakest: OperationAccuracyStat | null;
  warn: StudentWarn;
  inactiveDays: number | null;
  assignments: StudentAssignmentStatus[];
}): string[] {
  const recs: string[] = [];

  if (args.warn.neverActive) {
    recs.push(
      "Der Schueler hat noch keine Aufgabe geloest. Ein gemeinsamer Einstieg oder eine erste leichte Aufgabe hilft beim Start."
    );
    return recs;
  }

  if (args.warn.inactive && args.inactiveDays !== null) {
    recs.push(
      `Seit ${args.inactiveDays} Tagen inaktiv — kurz nachfassen und zum regelmaessigen Ueben motivieren (taegliche kleine Einheiten).`
    );
  }

  if (args.weakest && args.weakest.accuracy < 60) {
    recs.push(
      `Schwerpunkt auf ${args.weakest.label} legen: nur ${args.weakest.accuracy}% richtig (${args.weakest.correct}/${args.weakest.total}). Gezielte Uebungseinheit zu dieser Rechenart einplanen.`
    );
  } else if (args.weakest) {
    recs.push(
      `Schwaechste Rechenart ist ${args.weakest.label} (${args.weakest.accuracy}%). Mit einigen Wiederholungsaufgaben festigen.`
    );
  }

  if (args.accuracy >= 85 && args.stats.total >= 20) {
    recs.push(
      "Sehr sichere Gesamtleistung — schwierigere Aufgaben oder die naechste Klassenstufe als Herausforderung anbieten."
    );
  } else if (args.accuracy < 50 && args.stats.total >= 10) {
    recs.push(
      "Insgesamt niedrige Trefferquote — Grundlagen wiederholen und Aufgabenniveau voruebergehend senken."
    );
  }

  const overdue = args.assignments.filter((a) => a.status === "overdue");
  if (overdue.length > 0) {
    recs.push(
      `${overdue.length} ueberfaellige Aufgabe(n): ${overdue
        .map((a) => `"${a.title}"`)
        .join(", ")} — Abgabe einfordern oder Frist anpassen.`
    );
  }

  if (recs.length === 0) {
    recs.push(
      "Solide Leistung ohne Auffaelligkeiten — aktuelles Uebungsniveau beibehalten."
    );
  }

  return recs;
}

// ============================================================
// Klassen-Bericht
// ============================================================

/** Ein Schueler-Eintrag innerhalb des Klassen-Berichts. */
export type ClassReportStudent = {
  userId: string;
  username: string;
  displayName: string;
  stats: ProgressStats;
  accuracy: number | null;
  warn: StudentWarn;
  inactiveDays: number | null;
  streak: number;
};

/** Verteilung der Aufgaben-Stati ueber alle Klassen-Abgaben. */
export type AssignmentStatusDistribution = Record<AssignmentStatusKey, number>;

/** Vollstaendiger, druckbarer Bericht einer Klasse. */
export type ClassReport = {
  className: string;
  totalStudents: number;
  totalExercises: number;
  totalPoints: number;
  /** Klassen-Gesamtgenauigkeit (oder null ohne Daten). */
  accuracy: number | null;
  /** Genauigkeit pro Rechenart ueber die ganze Klasse. */
  operations: OperationAccuracyStat[];
  /** Schwaechste Rechenart der Klasse. */
  weakest: OperationAccuracyStat | null;
  /** Verteilung der Aufgaben-Stati. */
  assignmentDistribution: AssignmentStatusDistribution;
  /** Anzahl zugewiesener Aufgaben. */
  assignmentCount: number;
  /** Alle Schueler, nach Risiko und Name sortiert. */
  students: ClassReportStudent[];
  /** Schueler mit mindestens einem Warn-Flag. */
  atRiskStudents: ClassReportStudent[];
  /** Handlungsempfehlungen ("wo ansetzen"). */
  recommendations: string[];
};

/** Eingabeparameter fuer buildClassReport. */
export type BuildClassReportInput = {
  className: string;
  students: { userId: string; username: string }[];
  progressByChild: Map<string, ProgressStats>;
  streakByChild: Map<string, number>;
  operationEntries: OperationEntryRow[] | null | undefined;
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
  now?: Date;
};

/**
 * Baut den vollstaendigen Klassen-Bericht inkl. Handlungsempfehlungen.
 */
export function buildClassReport(input: BuildClassReportInput): ClassReport {
  const now = input.now ?? new Date();

  // Schueler-Eintraege aufbauen.
  const students: ClassReportStudent[] = input.students.map((s) => {
    const stats = input.progressByChild.get(s.userId) ?? {
      points: 0,
      total: 0,
      correct: 0,
      lastAt: null,
    };
    const warn = computeStudentWarn(stats, now);
    return {
      userId: s.userId,
      username: s.username,
      displayName: formatName(s.username),
      stats,
      accuracy: stats.total > 0 ? computeAccuracy(stats.correct, stats.total) : null,
      warn,
      inactiveDays: daysInactive(stats, now),
      streak: input.streakByChild.get(s.userId) ?? 0,
    };
  });

  // Risiko zuerst, dann alphabetisch.
  students.sort((a, b) => {
    const wa = warnWeight(a.warn);
    const wb = warnWeight(b.warn);
    if (wa !== wb) return wb - wa;
    return a.displayName.localeCompare(b.displayName, "de");
  });

  // Klassen-Summen.
  let totalExercises = 0;
  let totalPoints = 0;
  let totalCorrect = 0;
  for (const s of students) {
    totalExercises += s.stats.total;
    totalPoints += s.stats.points;
    totalCorrect += s.stats.correct;
  }

  const operations = aggregateOperationAccuracy(input.operationEntries);
  const weakest = weakestOperation(operations);

  // Aufgaben-Status-Verteilung ueber alle Schueler x Aufgaben.
  const distribution: AssignmentStatusDistribution = {
    submitted: 0,
    in_progress: 0,
    overdue: 0,
    open: 0,
  };
  for (const assignment of input.assignments) {
    for (const s of students) {
      const submission = input.submissions.find(
        (sub) =>
          sub.assignment_id === assignment.id && sub.student_id === s.userId
      );
      const status = resolveAssignmentStatus(assignment, submission, now);
      distribution[status] += 1;
    }
  }

  const atRiskStudents = students.filter((s) => hasWarn(s.warn));

  return {
    className: input.className,
    totalStudents: students.length,
    totalExercises,
    totalPoints,
    accuracy:
      totalExercises > 0 ? computeAccuracy(totalCorrect, totalExercises) : null,
    operations,
    weakest,
    assignmentDistribution: distribution,
    assignmentCount: input.assignments.length,
    students,
    atRiskStudents,
    recommendations: buildClassRecommendations({
      accuracy: totalExercises > 0 ? computeAccuracy(totalCorrect, totalExercises) : null,
      weakest,
      atRiskStudents,
      totalStudents: students.length,
      distribution,
      assignmentCount: input.assignments.length,
    }),
  };
}

/**
 * Leitet konkrete Handlungsempfehlungen fuer die Klasse ab.
 */
function buildClassRecommendations(args: {
  accuracy: number | null;
  weakest: OperationAccuracyStat | null;
  atRiskStudents: ClassReportStudent[];
  totalStudents: number;
  distribution: AssignmentStatusDistribution;
  assignmentCount: number;
}): string[] {
  const recs: string[] = [];

  if (args.totalStudents === 0) {
    recs.push("Noch keine Schueler in der Klasse — zuerst Schueler hinzufuegen.");
    return recs;
  }

  if (args.weakest && args.weakest.accuracy < 60) {
    recs.push(
      `Klassenweite Schwaeche bei ${args.weakest.label} (nur ${args.weakest.accuracy}% richtig) — eine gemeinsame Wiederholungsstunde zu dieser Rechenart einplanen.`
    );
  } else if (args.weakest) {
    recs.push(
      `Schwaechste Rechenart der Klasse ist ${args.weakest.label} (${args.weakest.accuracy}%) — punktuell festigen.`
    );
  }

  const inactive = args.atRiskStudents.filter(
    (s) => s.warn.inactive || s.warn.neverActive
  );
  if (inactive.length > 0) {
    recs.push(
      `${inactive.length} Schueler ueben selten oder nie (${inactive
        .map((s) => s.displayName)
        .join(", ")}) — gezielt zum regelmaessigen Ueben motivieren.`
    );
  }

  const lowAcc = args.atRiskStudents.filter((s) => s.warn.lowAccuracy);
  if (lowAcc.length > 0) {
    recs.push(
      `${lowAcc.length} Schueler mit schwacher Trefferquote (${lowAcc
        .map((s) => s.displayName)
        .join(", ")}) — individuelle Foerderung oder leichtere Aufgaben anbieten.`
    );
  }

  if (args.assignmentCount > 0) {
    const open = args.distribution.open + args.distribution.in_progress;
    if (args.distribution.overdue > 0) {
      recs.push(
        `${args.distribution.overdue} ueberfaellige Abgaben — Abgaben einfordern oder Fristen anpassen.`
      );
    }
    if (open > 0) {
      recs.push(
        `${open} Aufgaben noch in Bearbeitung oder offen — Fortschritt im Blick behalten.`
      );
    }
  }

  if (args.accuracy !== null && args.accuracy >= 80) {
    recs.push(
      "Die Klasse arbeitet insgesamt sehr sicher — schwierigere Aufgaben als Herausforderung anbieten."
    );
  }

  if (recs.length === 0) {
    recs.push(
      "Keine Auffaelligkeiten — die Klasse arbeitet auf solidem Niveau, aktuelles Vorgehen beibehalten."
    );
  }

  return recs;
}
