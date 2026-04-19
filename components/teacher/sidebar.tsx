"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClassAction, type ClassActionState } from "@/app/(teacher)/lehrer/actions";
import { logoutAction } from "@/app/login/actions";

type ClassItem = { id: string; name: string };

const initialState: ClassActionState = { error: null };

const NAV_ITEMS = [
  { href: "/lehrer/dashboard", label: "Dashboard", icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  )},
  { href: "/lehrer/aufgaben", label: "Aufgaben", icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  )},
  { href: "/lehrer/nachrichten", label: "Nachrichten", icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  )},
];

export function Sidebar({
  teacherName,
  classes,
}: {
  teacherName: string;
  classes: ClassItem[];
}) {
  const pathname = usePathname();
  const [showAddForm, setShowAddForm] = useState(false);
  const [state, formAction, pending] = useActionState(createClassAction, initialState);

  if (state.success && showAddForm) {
    setShowAddForm(false);
    state.success = false;
  }

  return (
    <aside className="w-72 teacher-sidebar text-white flex flex-col min-h-dvh shrink-0">
      {/* Lehrer-Profil */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/30">
            {teacherName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{teacherName}</p>
            <p className="text-xs text-slate-400">Lehrkraft</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 flex flex-col gap-8">
        {/* Hauptnavigation */}
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-3 px-3">
            Menü
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Klassen */}
        <div>
          <div className="flex items-center justify-between mb-3 px-3">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">
              Klassen
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white text-xs font-bold transition-all"
              aria-label="Klasse hinzufügen"
            >
              +
            </button>
          </div>

          {showAddForm && (
            <form action={formAction} className="mb-3 px-1">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  name="className"
                  placeholder="z. B. 3a"
                  required
                  autoFocus
                  className="flex-1 h-9 px-3 text-sm rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="h-9 px-4 text-sm rounded-lg bg-indigo-500 hover:bg-indigo-400 font-medium disabled:opacity-50 transition-colors"
                >
                  {pending ? "…" : "OK"}
                </button>
              </div>
              {state.error && (
                <p className="text-xs text-red-400 mt-1.5 px-1">{state.error}</p>
              )}
            </form>
          )}

          {classes.length === 0 && !showAddForm ? (
            <p className="text-sm text-slate-500 italic px-3">
              Noch keine Klassen
            </p>
          ) : (
            <ul className="space-y-0.5">
              {classes.map((cls) => {
                const href = `/lehrer/klasse/${cls.id}`;
                const isActive = pathname === href;
                return (
                  <li key={cls.id}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-xs font-bold text-cyan-300 border border-cyan-500/20">
                        {cls.name.slice(0, 2)}
                      </span>
                      {cls.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>

      {/* Abmelden */}
      <div className="p-4 border-t border-white/10">
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all text-left"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Abmelden
          </button>
        </form>
      </div>
    </aside>
  );
}
