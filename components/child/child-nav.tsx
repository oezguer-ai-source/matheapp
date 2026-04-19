"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/login/actions";

const NAV_ITEMS = [
  { href: "/kind/dashboard", label: "Start", emoji: "🏠" },
  { href: "/kind/ueben", label: "Üben", emoji: "✏️" },
  { href: "/kind/aufgaben", label: "Aufgaben", emoji: "📋" },
  { href: "/kind/nachrichten", label: "Post", emoji: "💌" },
  { href: "/kind/spiel", label: "Spiel", emoji: "🎈" },
];

export function ChildNav({ displayName }: { displayName: string }) {
  const pathname = usePathname();

  return (
    <header className="relative z-20 bg-white/80 backdrop-blur-md border-b border-orange-100 px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Name */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧮</span>
          <span className="text-base font-bold text-slate-800 hidden sm:inline">
            Hallo, {displayName}!
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-b from-orange-400 to-yellow-400 text-white shadow-md shadow-orange-200/50 scale-105"
                    : "text-slate-500 hover:bg-orange-50 hover:text-slate-700"
                }`}
              >
                <span className="text-lg leading-none">{item.emoji}</span>
                <span className="mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Abmelden */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Abmelden
          </button>
        </form>
      </div>
    </header>
  );
}
