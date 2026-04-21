"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChildChatMessage = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  class_id: string | null;
  subject: string;
  body: string;
  created_at: string;
  is_from_me: boolean;
  is_broadcast: boolean;
};

export async function sendChildMessageAction(
  teacherId: string,
  body: string
): Promise<{ error: string | null; message?: ChildChatMessage }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const trimmed = body.trim();
  if (!trimmed) return { error: "Leere Nachricht." };

  const admin = createAdminClient();

  const { data: inserted, error } = await admin
    .from("messages")
    .insert({
      sender_id: user.id,
      recipient_id: teacherId,
      subject: "",
      body: trimmed,
    })
    .select("id, sender_id, recipient_id, class_id, subject, body, created_at")
    .single();

  if (error || !inserted) {
    return { error: "Nachricht konnte nicht gesendet werden." };
  }

  revalidatePath("/kind/nachrichten");
  return {
    error: null,
    message: {
      id: inserted.id,
      sender_id: inserted.sender_id,
      recipient_id: inserted.recipient_id,
      class_id: inserted.class_id,
      subject: inserted.subject,
      body: inserted.body,
      created_at: inserted.created_at,
      is_from_me: true,
      is_broadcast: false,
    },
  };
}

/** Lädt den gesamten Chat des Schülers mit seinem Lehrer + Klassenrundmails, chronologisch. */
export async function fetchChildConversationAction(): Promise<{
  error: string | null;
  messages?: ChildChatMessage[];
  teacherId?: string | null;
  teacherName?: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("class_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let teacherId: string | null = null;
  let teacherName: string | null = null;
  if (profile?.class_id) {
    const { data: classRow } = await admin
      .from("classes")
      .select("teacher_id")
      .eq("id", profile.class_id)
      .maybeSingle();
    teacherId = classRow?.teacher_id ?? null;
    if (teacherId) {
      const { data: teacherProfile } = await admin
        .from("profiles")
        .select("display_name")
        .eq("user_id", teacherId)
        .maybeSingle();
      teacherName = teacherProfile?.display_name ?? null;
    }
  }

  // Direktnachrichten zwischen Schüler und Lehrer
  const filters: string[] = [];
  if (teacherId) {
    filters.push(
      `and(sender_id.eq.${user.id},recipient_id.eq.${teacherId})`,
      `and(sender_id.eq.${teacherId},recipient_id.eq.${user.id})`
    );
  } else {
    filters.push(`recipient_id.eq.${user.id}`);
  }

  // Klassen-Rundmails
  if (profile?.class_id) {
    filters.push(`class_id.eq.${profile.class_id}`);
  }

  const { data: rows } = await admin
    .from("messages")
    .select("id, sender_id, recipient_id, class_id, subject, body, created_at")
    .or(filters.join(","))
    .order("created_at", { ascending: true })
    .limit(200);

  const messages: ChildChatMessage[] = (rows ?? []).map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    recipient_id: m.recipient_id,
    class_id: m.class_id,
    subject: m.subject ?? "",
    body: m.body,
    created_at: m.created_at,
    is_from_me: m.sender_id === user.id,
    is_broadcast: !!m.class_id,
  }));

  return { error: null, messages, teacherId, teacherName };
}

/** Markiert alle Nachrichten an diesen Schüler als gelesen. */
export async function markChildConversationReadAction(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("class_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const conditions = [`recipient_id.eq.${user.id}`];
  if (profile?.class_id) {
    conditions.push(`class_id.eq.${profile.class_id}`);
  }

  const { data: incoming } = await admin
    .from("messages")
    .select("id")
    .or(conditions.join(","))
    .neq("sender_id", user.id);

  const ids = (incoming ?? []).map((m) => m.id);
  if (ids.length === 0) return { error: null };

  const { data: existing } = await admin
    .from("message_reads")
    .select("message_id")
    .eq("user_id", user.id)
    .in("message_id", ids);

  const already = new Set((existing ?? []).map((r) => r.message_id));
  const rows = ids
    .filter((id) => !already.has(id))
    .map((id) => ({ message_id: id, user_id: user.id }));

  if (rows.length > 0) {
    await admin.from("message_reads").insert(rows);
  }

  return { error: null };
}
