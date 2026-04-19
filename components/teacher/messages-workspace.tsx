"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  fetchClassStudentsWithUnreadAction,
  fetchConversationAction,
  fetchStudentStatsAction,
  markConversationReadAction,
  sendChatMessageAction,
  type ChatMessage,
  type StudentStats,
  type StudentWithUnread,
} from "@/app/(teacher)/lehrer/nachrichten/actions";

type ClassItem = { id: string; name: string };

function formatName(username: string): string {
  return username
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "noch keine Aktivität";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "gerade eben";
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString("de-DE");
}

export function MessagesWorkspace({ classes }: { classes: ClassItem[] }) {
  const [activeClassId, setActiveClassId] = useState<string | null>(
    classes[0]?.id ?? null
  );
  const [students, setStudents] = useState<StudentWithUnread[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, startSending] = useTransition();

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Schüler einer Klasse laden
  const loadStudents = useCallback(async (classId: string) => {
    setLoadingStudents(true);
    const res = await fetchClassStudentsWithUnreadAction(classId);
    setLoadingStudents(false);
    if (!res.error) setStudents(res.students ?? []);
  }, []);

  useEffect(() => {
    if (activeClassId) loadStudents(activeClassId);
    else setStudents([]);
  }, [activeClassId, loadStudents]);

  // Konversation + Stats laden wenn Schüler gewählt
  const openChatFor = useCallback(async (studentId: string) => {
    setActiveStudentId(studentId);
    setChatOpen(true);
    setLoadingMessages(true);
    setLoadingStats(true);

    const [convRes, statsRes] = await Promise.all([
      fetchConversationAction(studentId),
      fetchStudentStatsAction(studentId),
    ]);

    setMessages(convRes.messages ?? []);
    setStats(statsRes.stats ?? null);
    setLoadingMessages(false);
    setLoadingStats(false);

    // Als gelesen markieren
    await markConversationReadAction(studentId);

    // Badge lokal auf 0 setzen
    setStudents((prev) =>
      prev.map((s) => (s.user_id === studentId ? { ...s, unread_count: 0 } : s))
    );
  }, []);

  // Autoscroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, chatOpen]);

  // Polling für neue Nachrichten alle 8s wenn Chat offen
  useEffect(() => {
    if (!chatOpen || !activeStudentId) return;
    const t = setInterval(async () => {
      const res = await fetchConversationAction(activeStudentId);
      if (res.messages) {
        setMessages((prev) => {
          if (prev.length === res.messages!.length) return prev;
          return res.messages!;
        });
      }
      // Schüler-Liste refresh für Badges
      if (activeClassId) {
        const sres = await fetchClassStudentsWithUnreadAction(activeClassId);
        if (sres.students) {
          setStudents(
            sres.students.map((s) =>
              s.user_id === activeStudentId ? { ...s, unread_count: 0 } : s
            )
          );
        }
      }
    }, 8000);
    return () => clearInterval(t);
  }, [chatOpen, activeStudentId, activeClassId]);

  const handleSend = () => {
    if (!activeStudentId || !draft.trim()) return;
    const body = draft.trim();
    startSending(async () => {
      const res = await sendChatMessageAction(activeStudentId, body);
      if (!res.error && res.message) {
        setMessages((prev) => [...prev, res.message!]);
        setDraft("");
      }
    });
  };

  const activeClass = classes.find((c) => c.id === activeClassId) ?? null;
  const activeStudent = students.find((s) => s.user_id === activeStudentId) ?? null;
  const totalUnread = students.reduce((acc, s) => acc + s.unread_count, 0);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)]">
      {/* Klassen-Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white/60 p-4 shrink-0">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
          Klassen
        </h2>
        {classes.length === 0 ? (
          <p className="text-sm text-slate-500 px-2 italic">Keine Klassen.</p>
        ) : (
          <ul className="space-y-1">
            {classes.map((cls) => {
              const isActive = cls.id === activeClassId;
              return (
                <li key={cls.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveClassId(cls.id);
                      setActiveStudentId(null);
                      setChatOpen(false);
                    }}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isActive
                          ? "bg-indigo-500 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {cls.name.slice(0, 2)}
                    </span>
                    {cls.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Schüler-Sidebar */}
      <aside className="w-72 border-r border-slate-200 bg-white p-4 shrink-0">
        <div className="flex items-baseline justify-between mb-3 px-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {activeClass ? `Schüler · ${activeClass.name}` : "Schüler"}
          </h2>
          {totalUnread > 0 && (
            <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">
              {totalUnread} neu
            </span>
          )}
        </div>
        {loadingStudents ? (
          <p className="text-sm text-slate-400 px-2">Lade…</p>
        ) : !activeClass ? (
          <p className="text-sm text-slate-400 px-2">Klasse auswählen.</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-slate-400 px-2">Keine Schüler in dieser Klasse.</p>
        ) : (
          <ul className="space-y-1">
            {students.map((s) => {
              const isActive = s.user_id === activeStudentId;
              const name = formatName(s.display_name);
              const initials = name
                .split(" ")
                .map((p) => p.charAt(0))
                .slice(0, 2)
                .join("");
              return (
                <li key={s.user_id}>
                  <button
                    type="button"
                    onClick={() => openChatFor(s.user_id)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-indigo-50 border border-indigo-200"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                      {initials.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {formatRelative(s.last_message_at)}
                      </p>
                    </div>
                    {s.unread_count > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold bg-rose-500 text-white rounded-full">
                        {s.unread_count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Hauptbereich: Schüler-Info */}
      <main className="flex-1 p-8 overflow-auto">
        {!activeStudentId ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Wähle einen Schüler
            </h2>
            <p className="text-sm text-slate-500 max-w-sm">
              Klick links eine Klasse an, dann einen Schüler — und schon öffnet
              sich der Chat. Im Hintergrund siehst du die wichtigsten Infos zum
              Schüler.
            </p>
          </div>
        ) : (
          <StudentBackground
            stats={stats}
            loading={loadingStats}
            studentName={activeStudent ? formatName(activeStudent.display_name) : ""}
          />
        )}
      </main>

      {/* Chat-Popup rechts unten */}
      {chatOpen && activeStudentId && (
        <div className="fixed bottom-4 right-4 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[80dvh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {activeStudent
                  ? formatName(activeStudent.display_name)
                      .split(" ")
                      .map((p) => p.charAt(0))
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : "?"}
              </div>
              <p className="text-sm font-semibold truncate">
                {activeStudent
                  ? formatName(activeStudent.display_name)
                  : "Chat"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="text-white/80 hover:text-white p-1"
              aria-label="Chat schließen"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
            {loadingMessages ? (
              <p className="text-sm text-slate-400 text-center">Lade Chat…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-slate-400 text-center mt-8">
                Noch keine Nachrichten. Schreib als Erstes etwas 👋
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.is_from_teacher ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                      m.is_from_teacher
                        ? "bg-indigo-500 text-white rounded-br-sm"
                        : "bg-white text-slate-800 rounded-bl-sm border border-slate-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        m.is_from_teacher ? "text-indigo-100" : "text-slate-400"
                      }`}
                    >
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-slate-200 p-3 bg-white">
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
                className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 max-h-24"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                className="h-9 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {sending ? "…" : "Senden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentBackground({
  stats,
  loading,
  studentName,
}: {
  stats: StudentStats | null;
  loading: boolean;
  studentName: string;
}) {
  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="h-8 w-60 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <p className="text-sm text-slate-500">Keine Daten verfügbar.</p>;
  }

  const accuracyColor =
    stats.accuracy === null
      ? "text-slate-400"
      : stats.accuracy >= 75
        ? "text-emerald-600"
        : stats.accuracy >= 50
          ? "text-amber-600"
          : "text-rose-600";

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
          Schüler
        </p>
        <h1 className="text-2xl font-bold text-slate-900">{studentName}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Letzte Aktivität: {formatRelative(stats.lastActivity)}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Punkte" value={stats.points.toString()} accent="indigo" />
        <StatCard
          label="Aufgaben gelöst"
          value={stats.totalExercises.toString()}
          accent="cyan"
        />
        <StatCard
          label="Genauigkeit"
          value={stats.accuracy === null ? "–" : `${stats.accuracy}%`}
          valueClassName={accuracyColor}
          accent="emerald"
        />
        <StatCard
          label="Offene Aufgaben"
          value={stats.openAssignments.toString()}
          accent="amber"
        />
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Übersicht</h2>
        <ul className="text-sm text-slate-600 space-y-1.5">
          <li>
            ✅ <strong>{stats.correctExercises}</strong> richtig von{" "}
            <strong>{stats.totalExercises}</strong> Übungen
          </li>
          <li>
            📝 <strong>{stats.submittedAssignments}</strong> abgegebene
            Aufgaben
          </li>
          <li>
            ⏳ <strong>{stats.openAssignments}</strong> offene Aufgaben
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  valueClassName,
}: {
  label: string;
  value: string;
  accent: "indigo" | "cyan" | "emerald" | "amber";
  valueClassName?: string;
}) {
  const accents: Record<string, string> = {
    indigo: "from-indigo-50 to-indigo-100/60 border-indigo-100",
    cyan: "from-cyan-50 to-cyan-100/60 border-cyan-100",
    emerald: "from-emerald-50 to-emerald-100/60 border-emerald-100",
    amber: "from-amber-50 to-amber-100/60 border-amber-100",
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${accents[accent]} p-4`}
    >
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`text-2xl font-bold mt-1 ${valueClassName ?? "text-slate-800"}`}
      >
        {value}
      </p>
    </div>
  );
}
