import { describe, it, expect } from "vitest";
import {
  computeStudentWarn,
  hasWarn,
  warnWeight,
  daysInactive,
  aggregateOperationAccuracy,
  weakestOperation,
  buildStudentReport,
  buildClassReport,
} from "@/lib/teacher/report";
import type { ProgressStats } from "@/lib/teacher/progress";

const NOW = new Date("2026-05-18T12:00:00Z");

function statsAt(daysAgo: number, total = 20, correct = 15): ProgressStats {
  const lastAt =
    daysAgo < 0
      ? null
      : new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();
  return { points: total * 5, total, correct, lastAt };
}

describe("computeStudentWarn", () => {
  it("markiert nie aktive Schueler", () => {
    const warn = computeStudentWarn(undefined, NOW);
    expect(warn.neverActive).toBe(true);
    expect(warn.inactive).toBe(false);
    expect(hasWarn(warn)).toBe(true);
  });

  it("markiert inaktive Schueler ab 5 Tagen", () => {
    expect(computeStudentWarn(statsAt(6), NOW).inactive).toBe(true);
    expect(computeStudentWarn(statsAt(3), NOW).inactive).toBe(false);
  });

  it("markiert niedrige Genauigkeit nur bei genug Aufgaben", () => {
    expect(computeStudentWarn(statsAt(1, 20, 5), NOW).lowAccuracy).toBe(true);
    expect(computeStudentWarn(statsAt(1, 5, 1), NOW).lowAccuracy).toBe(false);
  });
});

describe("warnWeight / daysInactive", () => {
  it("zaehlt gesetzte Flags", () => {
    expect(warnWeight({ inactive: true, lowAccuracy: true, neverActive: false })).toBe(2);
  });

  it("berechnet Tage seit letzter Aktivitaet", () => {
    expect(daysInactive(statsAt(7), NOW)).toBe(7);
    expect(daysInactive(undefined, NOW)).toBe(null);
  });
});

describe("aggregateOperationAccuracy / weakestOperation", () => {
  it("liefert immer alle vier Rechenarten", () => {
    const ops = aggregateOperationAccuracy([
      { operation_type: "addition", correct: true },
    ]);
    expect(ops).toHaveLength(4);
  });

  it("ignoriert Rechenarten mit zu wenig Daten fuer die Schwaeche", () => {
    const ops = aggregateOperationAccuracy([
      ...Array(10).fill({ operation_type: "addition", correct: false }),
      { operation_type: "division", correct: false },
    ]);
    const weakest = weakestOperation(ops);
    expect(weakest?.operation).toBe("addition");
  });

  it("gibt null zurueck, wenn keine Rechenart genug Daten hat", () => {
    expect(weakestOperation(aggregateOperationAccuracy([]))).toBe(null);
  });
});

describe("buildStudentReport", () => {
  it("erzeugt Empfehlungen fuer nie aktive Schueler", () => {
    const report = buildStudentReport({
      username: "max.muster",
      className: "3A",
      stats: { points: 0, total: 0, correct: 0, lastAt: null },
      operationEntries: [],
      streak: 0,
      assignments: [],
      submissions: [],
      timeline: [],
      now: NOW,
    });
    expect(report.displayName).toBe("Max Muster");
    expect(report.warn.neverActive).toBe(true);
    expect(report.recommendations[0]).toContain("noch keine Aufgabe");
  });

  it("empfiehlt Schwerpunkt auf schwaechster Rechenart", () => {
    const report = buildStudentReport({
      username: "lena.k",
      className: "3A",
      stats: statsAt(1, 30, 20),
      operationEntries: [
        ...Array(10).fill({ operation_type: "division", correct: false }),
        ...Array(10).fill({ operation_type: "addition", correct: true }),
      ],
      streak: 3,
      assignments: [],
      submissions: [],
      timeline: [],
      now: NOW,
    });
    expect(report.weakest?.operation).toBe("division");
    expect(report.recommendations.join(" ")).toContain("Division");
  });

  it("markiert ueberfaellige Aufgaben", () => {
    const report = buildStudentReport({
      username: "tom.b",
      className: "3A",
      stats: statsAt(1),
      operationEntries: [],
      streak: 1,
      assignments: [
        { id: "a1", title: "Einmaleins", due_date: "2026-05-01T00:00:00Z" },
      ],
      submissions: [],
      timeline: [],
      now: NOW,
    });
    expect(report.assignments[0].status).toBe("overdue");
    expect(report.recommendations.join(" ")).toContain("ueberfaellige");
  });
});

describe("buildClassReport", () => {
  it("aggregiert Klassen-Kennzahlen und sortiert Risiko-Schueler nach vorn", () => {
    const report = buildClassReport({
      className: "3A",
      students: [
        { userId: "s1", username: "anna.a" },
        { userId: "s2", username: "ben.b" },
      ],
      progressByChild: new Map<string, ProgressStats>([
        ["s1", statsAt(1, 20, 18)],
        ["s2", statsAt(10, 20, 4)], // inaktiv + niedrige Quote
      ]),
      streakByChild: new Map(),
      operationEntries: [],
      assignments: [],
      submissions: [],
      now: NOW,
    });
    expect(report.totalStudents).toBe(2);
    expect(report.totalExercises).toBe(40);
    expect(report.atRiskStudents.map((s) => s.userId)).toContain("s2");
    expect(report.students[0].userId).toBe("s2"); // Risiko zuerst
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it("verteilt Aufgaben-Stati korrekt", () => {
    const report = buildClassReport({
      className: "3A",
      students: [{ userId: "s1", username: "anna.a" }],
      progressByChild: new Map(),
      streakByChild: new Map(),
      operationEntries: [],
      assignments: [
        { id: "a1", title: "Alt", due_date: "2026-05-01T00:00:00Z" },
        { id: "a2", title: "Neu", due_date: "2026-06-01T00:00:00Z" },
      ],
      submissions: [
        {
          assignment_id: "a1",
          student_id: "s1",
          status: "submitted",
          submitted_at: "2026-04-30T00:00:00Z",
        },
      ],
      now: NOW,
    });
    expect(report.assignmentDistribution.submitted).toBe(1);
    expect(report.assignmentDistribution.open).toBe(1);
  });
});
