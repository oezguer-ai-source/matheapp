"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendChildMessageAction(
  teacherId: string,
  body: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const admin = createAdminClient();

  const { error } = await admin.from("messages").insert({
    sender_id: user.id,
    recipient_id: teacherId,
    subject: "",
    body,
  });

  if (error) return { error: "Nachricht konnte nicht gesendet werden." };

  revalidatePath("/kind/nachrichten");
  return { error: null };
}
