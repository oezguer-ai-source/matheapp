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
      className="flex gap-2 p-1 bg-white rounded-2xl mb-8"
    >
      <button
        type="button"
        role="tab"
        id="role-tab-child"
        aria-selected={value === "child"}
        aria-controls="login-panel-child"
        onClick={() => onChange("child")}
        className={cn(
          "flex-1 h-14 rounded-xl text-lg font-semibold transition-colors",
          value === "child"
            ? "bg-yellow-400 text-slate-900 ring-4 ring-yellow-300"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        )}
      >
        Kind
      </button>
      <button
        type="button"
        role="tab"
        id="role-tab-teacher"
        aria-selected={value === "teacher"}
        aria-controls="login-panel-teacher"
        onClick={() => onChange("teacher")}
        className={cn(
          "flex-1 h-14 rounded-xl text-base font-semibold transition-colors",
          value === "teacher"
            ? "bg-slate-900 text-white ring-2 ring-slate-400 ring-offset-2"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        )}
      >
        Lehrkraft
      </button>
    </div>
  );
}
