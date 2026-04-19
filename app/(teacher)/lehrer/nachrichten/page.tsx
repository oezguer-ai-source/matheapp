import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { MessageComposer } from "@/components/teacher/message-composer";

/** Formatiert "mia.müller" → "Mia Müller" */
function formatName(username: string): string {
  return username
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default async function NachrichtenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // Klassen des Lehrers laden
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", user!.id)
    .order("name");

  // Eingegangene Nachrichten (von Schülern an den Lehrer)
  const { data: inbox } = await admin
    .from("messages")
    .select("id, subject, body, created_at, sender_id")
    .eq("recipient_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Sender-Profile laden
  const senderIds = [...new Set((inbox ?? []).map((m) => m.sender_id))];
  const senderMap = new Map<string, string>();
  if (senderIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", senderIds);
    for (const p of profiles ?? []) {
      senderMap.set(p.user_id, formatName(p.display_name));
    }
  }

  // Gesendete Nachrichten
  const { data: sent } = await admin
    .from("messages")
    .select("id, subject, body, created_at, recipient_id, class_id")
    .eq("sender_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Empfänger-Profile und Klassen-Namen laden
  const recipientIds = [...new Set((sent ?? []).filter((m) => m.recipient_id).map((m) => m.recipient_id!))];
  const recipientMap = new Map<string, string>();
  if (recipientIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", recipientIds);
    for (const p of profiles ?? []) {
      recipientMap.set(p.user_id, formatName(p.display_name));
    }
  }

  const classMap = new Map<string, string>();
  for (const cls of classes ?? []) {
    classMap.set(cls.id, cls.name);
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">
        Nachrichten
      </h1>

      {/* Neue Nachricht */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Neue Nachricht
        </h2>
        <MessageComposer classes={classes ?? []} />
      </div>

      {/* Posteingang */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Posteingang
        </h2>
        {(!inbox || inbox.length === 0) ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Keine Nachrichten im Posteingang.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {inbox.map((msg) => (
              <Card key={msg.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {senderMap.get(msg.sender_id) ?? "Unbekannt"}
                      </p>
                      {msg.subject && (
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">
                          {msg.subject}
                        </p>
                      )}
                      <p className="text-sm text-slate-600 mt-1">{msg.body}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(msg.created_at).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Gesendet */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Gesendet
        </h2>
        {(!sent || sent.length === 0) ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Noch keine Nachrichten gesendet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {sent.map((msg) => {
              const target = msg.recipient_id
                ? `An: ${recipientMap.get(msg.recipient_id) ?? "Unbekannt"}`
                : msg.class_id
                  ? `An Klasse: ${classMap.get(msg.class_id) ?? "Unbekannt"}`
                  : "";
              return (
                <Card key={msg.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-slate-500">{target}</p>
                        {msg.subject && (
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">
                            {msg.subject}
                          </p>
                        )}
                        <p className="text-sm text-slate-600 mt-1">{msg.body}</p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {new Date(msg.created_at).toLocaleDateString("de-DE")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
