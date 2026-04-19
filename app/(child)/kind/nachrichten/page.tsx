import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChildMessageReply } from "@/components/child/message-reply";

export default async function KindNachrichtenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("class_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const admin = createAdminClient();

  // Nachrichten laden (an mich direkt oder an meine Klasse)
  const conditions = [`recipient_id.eq.${user.id}`];
  if (profile?.class_id) {
    conditions.push(`class_id.eq.${profile.class_id}`);
  }

  const { data: messages } = await admin
    .from("messages")
    .select("id, sender_id, subject, body, created_at, class_id, recipient_id")
    .or(conditions.join(","))
    .order("created_at", { ascending: false })
    .limit(50);

  // Sender-Namen laden
  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id))];
  const senderMap = new Map<string, string>();
  if (senderIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, display_name, role")
      .in("user_id", senderIds);
    for (const p of profiles ?? []) {
      const name = p.role === "teacher"
        ? p.display_name
        : p.display_name.split(".").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
      senderMap.set(p.user_id, name);
    }
  }

  // Lehrer-ID ermitteln (um antworten zu können)
  let teacherId: string | null = null;
  if (profile?.class_id) {
    const { data: classData } = await admin
      .from("classes")
      .select("teacher_id")
      .eq("id", profile.class_id)
      .maybeSingle();
    teacherId = classData?.teacher_id ?? null;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-6 animate-fade-in">
        💌 Meine Nachrichten
      </h1>

      {/* Antwort an Lehrer */}
      {teacherId && (
        <div className="mb-6 animate-fade-in">
          <ChildMessageReply teacherId={teacherId} />
        </div>
      )}

      {(!messages || messages.length === 0) ? (
        <div className="glass-card rounded-2xl p-8 text-center shadow-md animate-fade-in">
          <p className="text-5xl mb-4">📭</p>
          <h2 className="text-lg font-bold text-slate-700">Keine Nachrichten</h2>
          <p className="text-sm text-slate-500 mt-1">
            Hier erscheinen Nachrichten von deinem Lehrer.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {messages.map((msg, idx) => {
            const senderName = senderMap.get(msg.sender_id) ?? "Lehrer";
            const isFromTeacher = msg.sender_id !== user.id;
            const isClassMessage = !!msg.class_id;

            return (
              <div
                key={msg.id}
                className="glass-card rounded-2xl p-5 shadow-md animate-fade-in"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{isFromTeacher ? "👩‍🏫" : "📤"}</span>
                      <span className="text-sm font-bold text-slate-700">{senderName}</span>
                      {isClassMessage && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                          An alle
                        </span>
                      )}
                    </div>
                    {msg.subject && (
                      <p className="text-sm font-semibold text-slate-800">{msg.subject}</p>
                    )}
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{msg.body}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {new Date(msg.created_at).toLocaleDateString("de-DE")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
