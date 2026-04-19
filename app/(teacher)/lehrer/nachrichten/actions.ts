"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// --- Chat-Actions ---

export type ChatMessage = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  created_at: string;
  is_from_teacher: boolean;
};

export type StudentWithUnread = {
  user_id: string;
  display_name: string;
  unread_count: number;
  last_message_at: string | null;
};

/** Lädt Schüler einer Klasse inkl. ungelesener Nachrichten für den angemeldeten Lehrer. */
export async function fetchClassStudentsWithUnreadAction(
  classId: string
): Promise<{ error: string | null; students?: StudentWithUnread[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  // Klasse gehört dem Lehrer?
  const { data: cls } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (!cls) return { error: "Klasse nicht gefunden." };

  const admin = createAdminClient();

  const { data: students } = await admin
    .from("profiles")
    .select("user_id, display_name")
    .eq("class_id", classId)
    .eq("role", "child")
    .order("display_name");

  if (!students || students.length === 0) {
    return { error: null, students: [] };
  }

  const studentIds = students.map((s) => s.user_id);

  // Nachrichten der Schüler an den Lehrer + bereits gelesene
  const { data: incoming } = await admin
    .from("messages")
    .select("id, sender_id, created_at")
    .eq("recipient_id", user.id)
    .in("sender_id", studentIds);

  const incomingIds = (incoming ?? []).map((m) => m.id);

  const { data: reads } = incomingIds.length
    ? await admin
        .from("message_reads")
        .select("message_id")
        .eq("user_id", user.id)
        .in("message_id", incomingIds)
    : { data: [] as { message_id: string }[] };

  const readSet = new Set((reads ?? []).map((r) => r.message_id));

  // Letzte Nachricht (egal welche Richtung) für Sortierung
  const { data: outgoing } = await admin
    .from("messages")
    .select("recipient_id, created_at")
    .eq("sender_id", user.id)
    .in("recipient_id", studentIds);

  const lastByStudent = new Map<string, string>();
  for (const m of incoming ?? []) {
    const prev = lastByStudent.get(m.sender_id);
    if (!prev || m.created_at > prev) lastByStudent.set(m.sender_id, m.created_at);
  }
  for (const m of outgoing ?? []) {
    if (!m.recipient_id) continue;
    const prev = lastByStudent.get(m.recipient_id);
    if (!prev || m.created_at > prev) lastByStudent.set(m.recipient_id, m.created_at);
  }

  const unreadByStudent = new Map<string, number>();
  for (const m of incoming ?? []) {
    if (readSet.has(m.id)) continue;
    unreadByStudent.set(m.sender_id, (unreadByStudent.get(m.sender_id) ?? 0) + 1);
  }

  const result: StudentWithUnread[] = students.map((s) => ({
    user_id: s.user_id,
    display_name: s.display_name,
    unread_count: unreadByStudent.get(s.user_id) ?? 0,
    last_message_at: lastByStudent.get(s.user_id) ?? null,
  }));

  // Sortierung: ungelesen zuerst, dann nach letzter Nachricht, dann Name
  result.sort((a, b) => {
    if ((b.unread_count > 0 ? 1 : 0) !== (a.unread_count > 0 ? 1 : 0)) {
      return (b.unread_count > 0 ? 1 : 0) - (a.unread_count > 0 ? 1 : 0);
    }
    if (a.last_message_at && b.last_message_at) {
      return b.last_message_at.localeCompare(a.last_message_at);
    }
    if (a.last_message_at) return -1;
    if (b.last_message_at) return 1;
    return a.display_name.localeCompare(b.display_name, "de");
  });

  return { error: null, students: result };
}

/** Lädt den Chat-Thread zwischen dem aktuellen Lehrer und einem Schüler. */
export async function fetchConversationAction(
  studentId: string
): Promise<{ error: string | null; messages?: ChatMessage[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const admin = createAdminClient();

  const { data: messages } = await admin
    .from("messages")
    .select("id, sender_id, recipient_id, body, created_at")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${studentId}),and(sender_id.eq.${studentId},recipient_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true })
    .limit(200);

  const result: ChatMessage[] = (messages ?? []).map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    recipient_id: m.recipient_id,
    body: m.body,
    created_at: m.created_at,
    is_from_teacher: m.sender_id === user.id,
  }));

  return { error: null, messages: result };
}

/** Sendet eine Chat-Nachricht vom Lehrer an einen Schüler. */
export async function sendChatMessageAction(
  studentId: string,
  body: string
): Promise<{ error: string | null; message?: ChatMessage }> {
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
      recipient_id: studentId,
      subject: "",
      body: trimmed,
    })
    .select("id, sender_id, recipient_id, body, created_at")
    .single();

  if (error || !inserted) return { error: "Nachricht konnte nicht gesendet werden." };

  revalidatePath("/lehrer/nachrichten");
  return {
    error: null,
    message: {
      id: inserted.id,
      sender_id: inserted.sender_id,
      recipient_id: inserted.recipient_id,
      body: inserted.body,
      created_at: inserted.created_at,
      is_from_teacher: true,
    },
  };
}

/** Markiert alle eingehenden Nachrichten eines Schülers als gelesen. */
export async function markConversationReadAction(
  studentId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const admin = createAdminClient();

  const { data: incoming } = await admin
    .from("messages")
    .select("id")
    .eq("sender_id", studentId)
    .eq("recipient_id", user.id);

  const ids = (incoming ?? []).map((m) => m.id);
  if (ids.length === 0) return { error: null };

  const { data: existingReads } = await admin
    .from("message_reads")
    .select("message_id")
    .eq("user_id", user.id)
    .in("message_id", ids);

  const already = new Set((existingReads ?? []).map((r) => r.message_id));
  const rows = ids
    .filter((id) => !already.has(id))
    .map((id) => ({ message_id: id, user_id: user.id }));

  if (rows.length > 0) {
    await admin.from("message_reads").insert(rows);
  }

  revalidatePath("/lehrer/nachrichten");
  return { error: null };
}

/** Lädt Statistiken eines Schülers für die Hintergrund-Ansicht. */
export type StudentStats = {
  displayName: string;
  points: number;
  totalExercises: number;
  correctExercises: number;
  accuracy: number | null;
  lastActivity: string | null;
  openAssignments: number;
  submittedAssignments: number;
};

export async function fetchStudentStatsAction(
  studentId: string
): Promise<{ error: string | null; stats?: StudentStats }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, class_id")
    .eq("user_id", studentId)
    .maybeSingle();

  if (!profile) return { error: "Schüler nicht gefunden." };

  // Lehrer-Zugriff prüfen
  if (profile.class_id) {
    const { data: cls } = await admin
      .from("classes")
      .select("id")
      .eq("id", profile.class_id)
      .eq("teacher_id", user.id)
      .maybeSingle();
    if (!cls) return { error: "Kein Zugriff." };
  }

  const { data: entries } = await admin
    .from("progress_entries")
    .select("correct, points_earned, created_at")
    .eq("child_id", studentId)
    .neq("operation_type", "minigame_redeem");

  let points = 0;
  let total = 0;
  let correct = 0;
  let lastAt: string | null = null;
  for (const e of entries ?? []) {
    points += e.points_earned ?? 0;
    total += 1;
    if (e.correct) correct += 1;
    if (e.created_at && (!lastAt || e.created_at > lastAt)) lastAt = e.created_at;
  }

  // Zugewiesene Aufgaben
  let openAssignments = 0;
  let submittedAssignments = 0;
  if (profile.class_id) {
    const { data: assignmentLinks } = await admin
      .from("assignment_classes")
      .select("assignment_id")
      .eq("class_id", profile.class_id);

    const assignmentIds = (assignmentLinks ?? []).map((a) => a.assignment_id);
    if (assignmentIds.length > 0) {
      const { data: subs } = await admin
        .from("assignment_submissions")
        .select("status")
        .eq("student_id", studentId)
        .in("assignment_id", assignmentIds);

      const submittedSet = new Set(
        (subs ?? []).filter((s) => s.status === "submitted").map(() => true)
      );
      submittedAssignments = (subs ?? []).filter((s) => s.status === "submitted").length;
      openAssignments = assignmentIds.length - submittedAssignments;
      void submittedSet;
    }
  }

  return {
    error: null,
    stats: {
      displayName: profile.display_name,
      points,
      totalExercises: total,
      correctExercises: correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : null,
      lastActivity: lastAt,
      openAssignments,
      submittedAssignments,
    },
  };
}
