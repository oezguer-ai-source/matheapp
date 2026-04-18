"use client";

import type { OperationAccuracy } from "@/types/teacher-dashboard";

/** Deutsche Operationsnamen */
const OPERATION_LABELS: Record<OperationAccuracy["operation_type"], string> = {
  addition: "Addition",
  subtraktion: "Subtraktion",
  multiplikation: "Multiplikation",
  division: "Division",
};

/** Farbklassen basierend auf Genauigkeit */
function getAccuracyColor(accuracy: number, total: number): string {
  if (total === 0) return "bg-gray-50 text-gray-500";
  if (accuracy < 50) return "bg-red-50 text-red-600";
  if (accuracy <= 75) return "bg-amber-50 text-amber-600";
  return "bg-green-50 text-green-600";
}

type StudentDetailProps = {
  studentName: string;
  operations: OperationAccuracy[];
  isLoading: boolean;
};

export function StudentDetail({
  studentName,
  operations,
  isLoading,
}: StudentDetailProps) {
  // Loading-State: Skeleton mit 4 Karten-Platzhaltern
  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-sm font-medium text-slate-700 mb-3">
          Genauigkeit nach Rechenart: {studentName}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Leerer State: alle total === 0
  const hasExercises = operations.some((op) => op.total > 0);
  if (!hasExercises) {
    return (
      <div className="p-4">
        <p className="text-sm text-slate-500">
          Noch keine Uebungen fuer {studentName}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-sm font-medium text-slate-700 mb-3">
        Genauigkeit nach Rechenart: {studentName}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {operations.map((op) => (
          <div
            key={op.operation_type}
            className={`rounded-lg p-3 ${getAccuracyColor(op.accuracy, op.total)}`}
          >
            <p className="text-sm font-medium">
              {OPERATION_LABELS[op.operation_type]}
            </p>
            <p className="text-lg font-bold">
              {op.total > 0 ? `${op.accuracy}%` : "--"}
            </p>
            <p className="text-xs opacity-75">
              {op.total} {op.total === 1 ? "Aufgabe" : "Aufgaben"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
