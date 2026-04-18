export type OperationAccuracy = {
  operation_type: "addition" | "subtraktion" | "multiplikation" | "division";
  total: number;
  correct: number;
  accuracy: number; // 0-100 Prozent
};

export type StudentOverview = {
  userId: string;
  displayName: string;
  gradeLevel: number;
  totalPoints: number;
  exerciseCount: number;
  correctCount: number;
  accuracy: number; // 0-100 Prozent
  lastActivity: string | null; // ISO date string oder null wenn keine Aktivitaet
};
