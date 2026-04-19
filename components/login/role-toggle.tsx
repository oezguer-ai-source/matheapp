"use client";

import { cn } from "@/lib/utils";

export type LoginRole = "child" | "teacher";

export function RoleToggle({
  value,
  onChange,
}: {
  value: LoginRole;
  onChange: (role: LoginRole) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Rolle wählen"
      className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl mb-8"
    >
      <button
        type="button"
        role="tab"
        id="role-tab-child"
        aria-selected={value === "child"}
        aria-controls="login-panel-child"
        onClick={() => onChange("child")}
        className={cn(
          "flex-1 h-14 rounded-xl text-lg font-bold transition-all duration-300",
          value === "child"
            ? "bg-gradient-to-r from-orange-400 to-yellow-400 text-white shadow-lg shadow-orange-200/50 scale-[1.02]"
            : "bg-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60"
        )}
      >
        🎒 Kind
      </button>
      <button
        type="button"
        role="tab"
        id="role-tab-teacher"
        aria-selected={value === "teacher"}
        aria-controls="login-panel-teacher"
        onClick={() => onChange("teacher")}
        className={cn(
          "flex-1 h-14 rounded-xl text-base font-semibold transition-all duration-300",
          value === "teacher"
            ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/50 scale-[1.02]"
            : "bg-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60"
        )}
      >
        Lehrkraft
      </button>
    </div>
  );
}
