"use client";

import { useState, useCallback } from "react";
import type { StudentOverview, OperationAccuracy } from "@/types/teacher-dashboard";
import { formatRelativeDate, isInactive } from "@/lib/utils/relative-date";
import { StudentDetail } from "@/components/teacher/student-detail";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- Typen ---

type SortKey = "displayName" | "totalPoints" | "exerciseCount" | "accuracy" | "lastActivity";
type SortDirection = "asc" | "desc";

type ClassTableProps = {
  students: StudentOverview[];
  fetchOperationAccuracyAction: (childId: string) => Promise<OperationAccuracy[]>;
};

// --- Hilfsfunktionen ---

/** Farbklassen fuer Genauigkeits-Badge */
function getAccuracyBadgeClasses(accuracy: number, exerciseCount: number): string {
  if (exerciseCount === 0) return "bg-gray-100 text-gray-500";
  if (accuracy < 50) return "bg-red-50 text-red-600";
  if (accuracy <= 75) return "bg-amber-50 text-amber-600";
  return "bg-green-50 text-green-600";
}

/** Sortier-Pfeil Unicode */
function getSortIndicator(key: SortKey, currentKey: SortKey, direction: SortDirection): string {
  if (key !== currentKey) return "";
  return direction === "asc" ? " \u25B2" : " \u25BC";
}

/** Sortier-Vergleichsfunktion */
function compareStudents(a: StudentOverview, b: StudentOverview, key: SortKey, direction: SortDirection): number {
  const multiplier = direction === "asc" ? 1 : -1;

  if (key === "displayName") {
    return multiplier * a.displayName.localeCompare(b.displayName, "de");
  }

  if (key === "lastActivity") {
    // null immer zuletzt, egal welche Richtung
    if (!a.lastActivity && !b.lastActivity) return 0;
    if (!a.lastActivity) return 1;
    if (!b.lastActivity) return -1;
    return multiplier * a.lastActivity.localeCompare(b.lastActivity);
  }

  // Numerische Spalten
  const numA = a[key] as number;
  const numB = b[key] as number;
  return multiplier * (numA - numB);
}

// --- Spalten-Konfiguration ---

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "displayName", label: "Name" },
  { key: "totalPoints", label: "Punkte" },
  { key: "exerciseCount", label: "Aufgaben" },
  { key: "accuracy", label: "Genauigkeit" },
  { key: "lastActivity", label: "Letzte Aktivitaet" },
];

// --- Komponente ---

export function ClassTable({ students, fetchOperationAccuracyAction }: ClassTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("displayName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [operationData, setOperationData] = useState<Map<string, OperationAccuracy[]>>(new Map());
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null);

  // Sortierung umschalten
  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDirection("asc");
      return key;
    });
  }, []);

  // Zeile expandieren / zuklappen
  const handleRowClick = useCallback(
    async (studentId: string) => {
      if (expandedStudentId === studentId) {
        setExpandedStudentId(null);
        return;
      }

      setExpandedStudentId(studentId);

      // Daten laden, wenn noch nicht gecacht
      if (!operationData.has(studentId)) {
        setLoadingStudentId(studentId);
        try {
          const data = await fetchOperationAccuracyAction(studentId);
          setOperationData((prev) => {
            const next = new Map(prev);
            next.set(studentId, data);
            return next;
          });
        } finally {
          setLoadingStudentId(null);
        }
      }
    },
    [expandedStudentId, operationData, fetchOperationAccuracyAction]
  );

  // Sortierte Schueler-Liste
  const sortedStudents = [...students].sort((a, b) =>
    compareStudents(a, b, sortKey, sortDirection)
  );

  if (students.length === 0) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((col) => (
            <TableHead
              key={col.key}
              className="cursor-pointer select-none hover:bg-muted/50"
              onClick={() => handleSort(col.key)}
            >
              {col.label}
              {getSortIndicator(col.key, sortKey, sortDirection)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedStudents.map((student) => {
          const isExpanded = expandedStudentId === student.userId;
          const inactive = isInactive(student.lastActivity);
          const isLoadingThis = loadingStudentId === student.userId;

          return (
            <StudentRow
              key={student.userId}
              student={student}
              isExpanded={isExpanded}
              inactive={inactive}
              isLoading={isLoadingThis}
              operations={operationData.get(student.userId) ?? []}
              onClick={() => handleRowClick(student.userId)}
            />
          );
        })}
      </TableBody>
    </Table>
  );
}

// --- Zeile-Komponente (fuer sauberere Struktur) ---

type StudentRowProps = {
  student: StudentOverview;
  isExpanded: boolean;
  inactive: boolean;
  isLoading: boolean;
  operations: OperationAccuracy[];
  onClick: () => void;
};

function StudentRow({
  student,
  isExpanded,
  inactive,
  isLoading,
  operations,
  onClick,
}: StudentRowProps) {
  const badgeClasses = getAccuracyBadgeClasses(student.accuracy, student.exerciseCount);
  const rowBg = inactive ? "bg-amber-50" : "";

  return (
    <>
      <TableRow
        className={`cursor-pointer ${rowBg}`}
        onClick={onClick}
        aria-expanded={isExpanded}
      >
        <TableCell className="font-medium">{student.displayName}</TableCell>
        <TableCell>{student.totalPoints}</TableCell>
        <TableCell>{student.exerciseCount}</TableCell>
        <TableCell>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeClasses}`}>
            {student.exerciseCount > 0 ? `${student.accuracy}%` : "--"}
          </span>
        </TableCell>
        <TableCell>{formatRelativeDate(student.lastActivity)}</TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={5} className="p-0 border-b-0">
            <StudentDetail
              studentName={student.displayName}
              operations={operations}
              isLoading={isLoading}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
