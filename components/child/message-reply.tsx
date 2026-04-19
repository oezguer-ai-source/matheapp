"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendChildMessageAction } from "@/app/(child)/kind/nachrichten/actions";

export function ChildMessageReply({ teacherId }: { teacherId: string }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    const result = await sendChildMessageAction(teacherId, body.trim());
    setSending(false);
    if (!result.error) {
      setBody("");
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 2000);
    }
  }

  if (sent) {
    return (
      <div className="glass-card rounded-2xl p-4 text-center shadow-md">
        <p className="text-lg">✅ Nachricht gesendet!</p>
      </div>
    );
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-400 to-violet-400 text-white font-bold shadow-md"
      >
        ✏️ Nachricht an Lehrer schreiben
      </Button>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 shadow-md">
      <p className="text-sm font-bold text-slate-700 mb-3">Nachricht an deinen Lehrer</p>
      <textarea
        rows={3}
        placeholder="Schreibe deine Frage oder Nachricht…"
        className="w-full rounded-xl border-2 border-indigo-200 bg-indigo-50/30 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all mb-3"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="flex-1 h-10 rounded-xl bg-indigo-500 text-white font-semibold"
        >
          {sending ? "Sende…" : "Senden"}
        </Button>
        <Button
          variant="outline"
          onClick={() => { setOpen(false); setBody(""); }}
          className="h-10 rounded-xl"
        >
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
