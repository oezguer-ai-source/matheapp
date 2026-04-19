"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type MessageActionState = { error: string | null; success?: boolean };

export async function sendMessageAction(
  _prev: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet." };

  const subject = (formData.get("subject") as string)?.trim() ?? "";
  const body = (formData.get("body") as string)?.trim();
  const targetType = formData.get("targetType") as string; // "class" | "student"
  const classId = formData.get("classId") as string | null;
  const studentId = formData.get("studentId") as string | null;

  if (!body) {
    return { error: "Bitte geben Sie eine Nachricht ein." };
  }

  const admin = createAdminClient();

  if (targetType === "class" && classId) {
    // Nachricht an ganze Klasse
    const { error } = await admin.from("messages").insert({
      sender_id: user.id,
      class_id: classId,
      subject,
      body,
    });
    if (error) return { error: "Nachricht konnte nicht gesendet werden." };
  } else if (targetType === "student" && studentId) {
    // Direktnachricht an Schüler
    const { error } = await admin.from("messages").insert({
      sender_id: user.id,
      recipient_id: studentId,
      subject,
      body,
    });
    if (error) return { error: "Nachricht konnte nicht gesendet werden." };
  } else {
    return { error: "Bitte wählen Sie einen Empfänger aus." };
  }

  revalidatePath("/lehrer/nachrichten");
  return { error: null, success: true };
}
