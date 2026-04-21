"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  fetchChildConversationAction,
  markChildConversationReadAction,
  sendChildMessageAction,
  type ChildChatMessage,
} from "@/app/(child)/kind/nachrichten/actions";

interface Props {
  initialMessages: ChildChatMessage[];
  teacherId: string | null;
  teacherName: string | null;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (sameDay(iso, today.toISOString())) return "Heute";
  if (sameDay(iso, yesterday.toISOString())) return "Gestern";
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function prettyTeacherName(raw: string | null): string {
  if (!raw) return "Lehrer";
  return raw.includes(".")
    ? raw
        .split(".")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ")
    : raw;
}

export function ChildChat({ initialMessages, teacherId, teacherName }: Props) {
  const [messages, setMessages] = useState<ChildChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, startSending] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const displayedTeacher = prettyTeacherName(teacherName);
  const initials = displayedTeacher
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    chatEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom("auto");
    markChildConversationReadAction().catch(() => {});
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Polling alle 8s
  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetchChildConversationAction();
      if (res.messages) {
        setMessages((prev) => {
          if (prev.length === res.messages!.length) return prev;
          return res.messages!;
        });
        markChildConversationReadAction().catch(() => {});
      }
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const handleSend = () => {
    const body = draft.trim();
    if (!body || !teacherId) return;
    setError(null);
    startSending(async () => {
      const res = await sendChildMessageAction(teacherId, body);
      if (res.error || !res.message) {
        setError(res.error ?? "Konnte nicht gesendet werden.");
        return;
      }
      setMessages((prev) => [...prev, res.message!]);
      setDraft("");
    });
  };

  // Messages gruppiert nach Tag
  const grouped: Array<{ day: string; items: ChildChatMessage[] }> = [];
  for (const m of messages) {
    const day = formatDay(m.created_at);
    const bucket = grouped[grouped.length - 1];
    if (bucket && bucket.day === day) bucket.items.push(m);
    else grouped.push({ day, items: [m] });
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
        <a
          href="/kind/dashboard"
          className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 text-xl"
          aria-label="Zurück"
        >
          ←
        </a>
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold shadow-sm">
          {initials || "👩‍🏫"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 truncate">{displayedTeacher}</p>
          <p className="text-xs text-emerald-600 font-medium">
            {teacherId ? "Dein Lehrer" : "Noch keiner Klasse zugeordnet"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-3">💬</div>
            <h2 className="text-lg font-bold text-slate-700 mb-1">
              Noch keine Nachrichten
            </h2>
            <p className="text-sm text-slate-500 max-w-xs">
              Schreib deinem Lehrer unten etwas — er sieht es in seinem Dashboard.
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.day} className="space-y-2">
              <div className="flex justify-center">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 rounded-full px-3 py-1">
                  {group.day}
                </span>
              </div>
              {group.items.map((m) => {
                // Klassen-Rundmail: zentrierte Info-Bubble
                if (m.is_broadcast) {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="max-w-[90%] bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">📢</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            An die Klasse
                          </span>
                        </div>
                        {m.subject && (
                          <p className="text-sm font-semibold text-slate-800 mb-0.5">
                            {m.subject}
                          </p>
                        )}
                        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                          {m.body}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 text-right">
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className={`flex ${m.is_from_me ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm shadow-sm ${
                        m.is_from_me
                          ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-br-sm"
                          : "bg-white text-slate-800 rounded-bl-sm border border-slate-200"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          m.is_from_me ? "text-indigo-100" : "text-slate-400"
                        }`}
                      >
                        {formatTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 bg-white px-3 sm:px-4 py-3 safe-bottom">
        {!teacherId ? (
          <p className="text-center text-sm text-slate-400">
            Du bist aktuell keiner Klasse zugeordnet.
          </p>
        ) : (
          <>
            {error && (
              <p className="text-xs text-red-600 mb-2">{error}</p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nachricht schreiben…"
                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 max-h-28"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                aria-label="Nachricht senden"
                className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-lg font-semibold disabled:opacity-40 active:scale-95 transition-transform shadow-md flex items-center justify-center"
              >
                {sending ? "…" : "➤"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
