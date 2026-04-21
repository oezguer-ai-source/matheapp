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
  mode?: "floating" | "page";
  startOpen?: boolean;
}

type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionResultLike = {
  results: Array<{ 0: { transcript: string }; isFinal: boolean; length: number }>;
  resultIndex: number;
};

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
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (sameDay(iso, today.toISOString())) return "Heute";
  if (sameDay(iso, yesterday.toISOString())) return "Gestern";
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", {
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

export function ChildChat({
  initialMessages,
  teacherId,
  teacherName,
  mode = "page",
  startOpen = true,
}: Props) {
  const [messages, setMessages] = useState<ChildChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, startSending] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(mode === "page" ? true : startOpen);
  const [listening, setListening] = useState(false);
  const [unread, setUnread] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const displayedTeacher = prettyTeacherName(teacherName);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    chatEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom("auto");
      markChildConversationReadAction().catch(() => {});
      setUnread(0);
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages.length, open, scrollToBottom]);

  // Polling alle 8s — auch geschlossen (für Unread-Badge)
  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetchChildConversationAction();
      if (res.messages) {
        setMessages((prev) => {
          if (prev.length === res.messages!.length) return prev;
          const newCount = res.messages!.length - prev.length;
          if (!open && newCount > 0) {
            setUnread((u) => u + newCount);
          }
          return res.messages!;
        });
        if (open) markChildConversationReadAction().catch(() => {});
      }
    }, 8000);
    return () => clearInterval(t);
  }, [open]);

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

  // Voice-to-Text via Web Speech API
  const toggleListening = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) {
      setError("Spracheingabe wird von diesem Browser nicht unterstützt.");
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const rec = new SR();
    rec.lang = "de-DE";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (event) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) {
        setDraft((prev) => (prev ? prev + " " + final : final).trim());
      } else if (interim) {
        // Live-Preview — nutze eine separate Variable im Draft nicht, einfach ignorieren
      }
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") {
        setError("Mikrofon-Zugriff erlaubst du bitte einmal im Browser.");
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        setError("Spracheingabe hat nicht geklappt.");
      }
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  };

  const grouped: Array<{ day: string; items: ChildChatMessage[] }> = [];
  for (const m of messages) {
    const day = formatDay(m.created_at);
    const bucket = grouped[grouped.length - 1];
    if (bucket && bucket.day === day) bucket.items.push(m);
    else grouped.push({ day, items: [m] });
  }

  // Floating-Mode: eingeklappte Bubble wenn zu
  if (mode === "floating" && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 via-orange-400 to-amber-400 shadow-2xl shadow-orange-200/60 flex items-center justify-center text-3xl active:scale-95 transition-all hover:scale-105 animate-float"
        aria-label="Chat öffnen"
      >
        <span className="drop-shadow-sm">💬</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow">
            {unread}
          </span>
        )}
      </button>
    );
  }

  const containerClasses =
    mode === "floating"
      ? "fixed bottom-4 right-4 left-4 sm:left-auto z-50 w-auto sm:w-[380px] max-w-full h-[560px] max-h-[85dvh] rounded-[28px] shadow-2xl overflow-hidden flex flex-col bg-gradient-to-b from-sky-50 via-white to-pink-50"
      : "flex flex-col h-[calc(100dvh-4rem)] bg-gradient-to-b from-sky-50 via-white to-pink-50";

  return (
    <div className={containerClasses}>
      {/* Dekorative Hintergrund-Seifenblasen */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-16 -left-8 w-40 h-40 rounded-full bg-pink-200/40 blur-2xl" />
        <div className="absolute top-20 -right-10 w-48 h-48 rounded-full bg-sky-200/40 blur-2xl" />
        <div className="absolute bottom-20 left-10 w-32 h-32 rounded-full bg-amber-200/30 blur-2xl" />
      </div>

      {/* Header */}
      <div className="relative flex items-center gap-3 px-4 py-3 bg-white/70 backdrop-blur-md border-b border-white/60 shadow-sm">
        {mode === "page" ? (
          <a
            href="/kind/dashboard"
            className="w-10 h-10 rounded-full hover:bg-white flex items-center justify-center text-slate-600 text-xl"
            aria-label="Zurück"
          >
            ←
          </a>
        ) : null}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-300 via-orange-300 to-amber-300 flex items-center justify-center text-2xl shadow-md border-2 border-white">
          👩‍🏫
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-slate-800 truncate">
            {displayedTeacher}
          </p>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {teacherId ? "Online" : "Noch keiner Klasse zugeordnet"}
          </p>
        </div>
        {mode === "floating" && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 text-lg"
            aria-label="Chat schließen"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="text-6xl mb-3 animate-wiggle">💌</div>
            <h2 className="text-lg font-extrabold text-slate-700 mb-1">
              Noch keine Nachrichten
            </h2>
            <p className="text-sm text-slate-500 max-w-xs">
              Schreib deinem Lehrer hallo — oder sprich einfach rein mit dem
              Mikrofon! 🎤
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.day} className="space-y-2">
              <div className="flex justify-center">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-white/80 backdrop-blur rounded-full px-3 py-1 shadow-sm">
                  {group.day}
                </span>
              </div>
              {group.items.map((m) => {
                if (m.is_broadcast) {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="max-w-[92%] bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-200 rounded-3xl px-4 py-3 shadow-md">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">📢</span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                            An die Klasse
                          </span>
                        </div>
                        {m.subject && (
                          <p className="text-sm font-bold text-slate-800 mb-0.5">
                            {m.subject}
                          </p>
                        )}
                        <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">
                          {m.body}
                        </p>
                        <p className="text-[10px] text-amber-700/70 mt-1 text-right">
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className={`flex ${m.is_from_me ? "justify-end" : "justify-start"} animate-fade-in`}
                  >
                    {!m.is_from_me && (
                      <div className="w-8 h-8 shrink-0 mr-2 rounded-full bg-gradient-to-br from-pink-300 via-orange-300 to-amber-300 flex items-center justify-center text-base shadow-sm border border-white">
                        👩‍🏫
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] px-4 py-2.5 text-sm shadow-md ${
                        m.is_from_me
                          ? "bg-gradient-to-br from-sky-400 to-indigo-400 text-white rounded-[22px] rounded-br-md"
                          : "bg-white text-slate-800 rounded-[22px] rounded-bl-md border border-slate-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          m.is_from_me ? "text-sky-100/90" : "text-slate-400"
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
      <div className="relative border-t border-white/60 bg-white/80 backdrop-blur-md px-3 sm:px-4 py-3">
        {!teacherId ? (
          <p className="text-center text-sm text-slate-400">
            Du bist aktuell keiner Klasse zugeordnet.
          </p>
        ) : (
          <>
            {error && (
              <p className="text-xs text-red-600 mb-2 px-1">{error}</p>
            )}
            <div className="flex items-end gap-2">
              {/* Mikrofon */}
              <button
                type="button"
                onClick={toggleListening}
                aria-label={listening ? "Aufnahme stoppen" : "Spracheingabe starten"}
                className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-lg shadow-md active:scale-95 transition-all border-2 ${
                  listening
                    ? "bg-rose-500 text-white border-rose-300 animate-pulse"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
                title="Reinreden statt tippen"
              >
                {listening ? "🔴" : "🎤"}
              </button>

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
                placeholder={listening ? "Ich höre zu…" : "Schreibe oder sprich…"}
                className="flex-1 resize-none rounded-2xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 max-h-28"
              />

              {/* Senden */}
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                aria-label="Nachricht senden"
                className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-lg font-semibold disabled:opacity-40 active:scale-95 transition-transform shadow-md flex items-center justify-center"
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
