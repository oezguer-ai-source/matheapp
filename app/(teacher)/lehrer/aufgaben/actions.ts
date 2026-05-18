"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/teacher/auth";
import {
  createAssignmentSchema,
  type CreateAssignmentInput,
} from "@/lib/schemas/assignment";

export async function createAssignmentAction(
  input: CreateAssignmentInput
): Promise<{ error: string | null }> {
  // A3 — Rollen-Pruefung: nur angemeldete Lehrkraefte duerfen Aufgaben erstellen.
  const auth = await requireTeacher();
  if (!auth.ok) return { error: auth.error };
  const { userId } = auth;

  // A2 — Server-seitige Validierung: gesamten Input per Zod pruefen
  // (Titel, Beschreibung, dueDate, Items inkl. Choice-Konsistenz).
  const parsed = createAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.",
    };
  }
  const data = parsed.data;

  const admin = createAdminClient();

  // A1 — Klassen-Eigentum pruefen: alle classIds muessen dem Lehrer gehoeren.
  // Verhindert das Zuweisen von Aufgaben an fremde Klassen.
  const { data: ownedClasses, error: ownedError } = await admin
    .from("classes")
    .select("id")
    .eq("teacher_id", userId)
    .in("id", data.classIds);

  if (ownedError) {
    return { error: "Klassen konnten nicht geprueft werden." };
  }

  const ownedIds = new Set((ownedClasses ?? []).map((c) => c.id));
  const allOwned = data.classIds.every((id) => ownedIds.has(id));
  if (!allOwned || ownedIds.size !== new Set(data.classIds).size) {
    return {
      error: "Mindestens eine der gewaehlten Klassen gehoert nicht zu Ihnen.",
    };
  }

  // 1. Aufgabe erstellen
  const { data: assignment, error: assignmentError } = await admin
    .from("assignments")
    .insert({
      teacher_id: userId,
      title: data.title,
      description: data.description,
      due_date: data.dueDate,
    })
    .select("id")
    .single();

  if (assignmentError || !assignment) {
    return { error: "Aufgabe konnte nicht erstellt werden." };
  }

  // 2. Items erstellen
  const itemRows = data.items.map((item) => ({
    assignment_id: assignment.id,
    sort_order: item.sortOrder,
    item_type: item.itemType,
    question: item.question,
    options: item.itemType === "choice" ? item.options : null,
    correct_options: item.itemType === "choice" ? item.correctOptions : null,
  }));

  const { error: itemsError } = await admin
    .from("assignment_items")
    .insert(itemRows);

  if (itemsError) {
    // Rollback
    await admin.from("assignments").delete().eq("id", assignment.id);
    return { error: "Aufgaben-Items konnten nicht erstellt werden." };
  }

  // 3. Klassen zuweisen (nur gepruefte, eigene Klassen)
  const classRows = data.classIds.map((classId) => ({
    assignment_id: assignment.id,
    class_id: classId,
  }));

  const { error: classError } = await admin
    .from("assignment_classes")
    .insert(classRows);

  if (classError) {
    await admin.from("assignments").delete().eq("id", assignment.id);
    return { error: "Klassen-Zuweisung fehlgeschlagen." };
  }

  revalidatePath("/lehrer/aufgaben");
  revalidatePath("/lehrer/dashboard");
  return { error: null };
}
