import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { StudentOverview, OperationAccuracy } from "@/types/teacher-dashboard";

const OPERATION_TYPES = [
  "addition",
  "subtraktion",
  "multiplikation",
  "division",
] as const;

/**
 * Laedt die Klassenuebersicht fuer den aktuell eingeloggten Lehrer.
 *
 * Ablauf:
 * 1. Lehrer-Profil laden -> class_id ermitteln
 * 2. Kinder der Klasse laden (role = 'child')
 * 3. progress_entries aller Kinder laden (ohne minigame_redeem)
 * 4. Client-seitig aggregieren (PostgREST kann kein GROUP BY)
 *
 * RLS-Policies teacher_reads_class_profiles und teacher_reads_class_progress
 * sichern die Datenisolation automatisch.
 */
export async function fetchClassOverview(
  supabase: SupabaseClient<Database>
): Promise<StudentOverview[]> {
  // Schritt 1: Aktuellen User + class_id holen
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: teacherProfile } = await supabase
    .from("profiles")
    .select("class_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!teacherProfile?.class_id) return [];

  const classId = teacherProfile.class_id;

  // Schritt 2: Alle Kind-Profile in der Klasse laden
  const { data: children } = await supabase
    .from("profiles")
    .select("user_id, display_name, grade_level")
    .eq("class_id", classId)
    .eq("role", "child");

  if (!children || children.length === 0) return [];

  const childIds = children.map((c) => c.user_id);

  // Schritt 3: progress_entries fuer alle Kinder laden (ohne minigame_redeem)
  const { data: entries } = await supabase
    .from("progress_entries")
    .select("child_id, correct, points_earned, created_at")
    .in("child_id", childIds)
    .neq("operation_type", "minigame_redeem");

  // Schritt 4: Client-seitig aggregieren
  const entriesByChild = new Map<
    string,
    { points: number; total: number; correct: number; lastAt: string | null }
  >();

  for (const entry of entries ?? []) {
    const existing = entriesByChild.get(entry.child_id) ?? {
      points: 0,
      total: 0,
      correct: 0,
      lastAt: null as string | null,
    };

    existing.points += entry.points_earned ?? 0;
    existing.total += 1;
    if (entry.correct) existing.correct += 1;
    if (
      entry.created_at &&
      (!existing.lastAt || entry.created_at > existing.lastAt)
    ) {
      existing.lastAt = entry.created_at;
    }

    entriesByChild.set(entry.child_id, existing);
  }

  // StudentOverview-Objekte bauen und alphabetisch sortieren
  const overviews: StudentOverview[] = children.map((child) => {
    const stats = entriesByChild.get(child.user_id);
    const exerciseCount = stats?.total ?? 0;
    const correctCount = stats?.correct ?? 0;

    return {
      userId: child.user_id,
      displayName: child.display_name,
      gradeLevel: child.grade_level ?? 1,
      totalPoints: stats?.points ?? 0,
      exerciseCount,
      correctCount,
      accuracy: exerciseCount > 0 ? Math.round((correctCount / exerciseCount) * 100) : 0,
      lastActivity: stats?.lastAt ?? null,
    };
  });

  overviews.sort((a, b) => a.displayName.localeCompare(b.displayName, "de"));

  return overviews;
}

/**
 * Laedt die Genauigkeit pro Rechenart fuer ein bestimmtes Kind.
 *
 * Gibt immer alle 4 Operationstypen zurueck (auch bei total=0 -> accuracy=0).
 * minigame_redeem-Eintraege werden ausgeschlossen.
 *
 * RLS-Policy teacher_reads_class_progress stellt sicher, dass nur Kinder
 * der eigenen Klasse abgefragt werden koennen.
 */
export async function fetchOperationAccuracy(
  supabase: SupabaseClient<Database>,
  childId: string
): Promise<OperationAccuracy[]> {
  const { data: entries } = await supabase
    .from("progress_entries")
    .select("operation_type, correct")
    .eq("child_id", childId)
    .neq("operation_type", "minigame_redeem");

  // Client-seitig nach operation_type gruppieren
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

  // Immer alle 4 Operationstypen zurueckgeben
  return OPERATION_TYPES.map((opType) => {
    const stats = grouped.get(opType);
    const total = stats?.total ?? 0;
    const correct = stats?.correct ?? 0;

    return {
      operation_type: opType,
      total,
      correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  });
}
