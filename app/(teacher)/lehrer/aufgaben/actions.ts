"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AssignmentItemInput = {
  sortOrder: number;
  type: "text" | "choice";
  question: string;
  options?: string[];
  correctOptions?: number[];
};

type CreateAssignmentInput = {
  title: string;
  description: string;
  dueDate: string;
  classIds: string[];
  items: AssignmentItemInput[];
};

export async function createAssignmentAction(
  input: CreateAssignmentInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet." };

  const admin = createAdminClient();

  // 1. Aufgabe erstellen
  const { data: assignment, error: assignmentError } = await admin
    .from("assignments")
    .insert({
      teacher_id: user.id,
      title: input.title,
      description: input.description,
      due_date: new Date(input.dueDate + "T23:59:59").toISOString(),
    })
    .select("id")
    .single();

  if (assignmentError || !assignment) {
    return { error: "Aufgabe konnte nicht erstellt werden." };
  }

  // 2. Items erstellen
  const itemRows = input.items.map((item) => ({
    assignment_id: assignment.id,
    sort_order: item.sortOrder,
    item_type: item.type,
    question: item.question,
    options: item.type === "choice" ? item.options : null,
    correct_options: item.type === "choice" ? item.correctOptions : null,
  }));

  const { error: itemsError } = await admin
    .from("assignment_items")
    .insert(itemRows);

  if (itemsError) {
    // Rollback
    await admin.from("assignments").delete().eq("id", assignment.id);
    return { error: "Aufgaben-Items konnten nicht erstellt werden." };
  }

  // 3. Klassen zuweisen
  const classRows = input.classIds.map((classId) => ({
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
