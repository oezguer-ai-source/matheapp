"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { RoleToggle, type LoginRole } from "@/components/login/role-toggle";
import { ChildLoginForm } from "@/components/login/child-login-form";
import { TeacherLoginForm } from "@/components/login/teacher-login-form";

export default function LoginClient() {
  const searchParams = useSearchParams();
  const confirmationFailed = searchParams.get("error") === "confirmation_failed";

  const [role, setRole] = useState<LoginRole>("child");

  return (
    <main className={`min-h-dvh grid place-items-center px-6 py-16 ${
      role === "child" ? "child-bg" : "bg-gradient-to-br from-slate-50 to-slate-100"
    }`}>
      <div className="w-full max-w-md relative z-10">
        {/* Logo / Titel */}
        <div className="text-center mb-8">
          {role === "child" ? (
            <>
              <div className="text-6xl mb-3 animate-float">🧮</div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500 bg-clip-text text-transparent">
                Matheapp
              </h1>
              <p className="text-lg text-slate-600 mt-1">Mathe macht Spaß!</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-slate-900">
                Matheapp
              </h1>
              <p className="text-base text-slate-500 mt-1">Lehrkräfte-Portal</p>
            </>
          )}
        </div>

        {/* Card */}
        <div className={`rounded-3xl p-8 lg:p-10 animate-fade-in ${
          role === "child"
            ? "glass-card shadow-xl shadow-orange-100/50"
            : "bg-white shadow-lg shadow-slate-200/50 border border-slate-200"
        }`}>
          {confirmationFailed && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 text-center">
              Die E-Mail-Bestätigung ist fehlgeschlagen. Bitte versuchen Sie es
              erneut oder registrieren Sie sich neu.
            </div>
          )}

          <RoleToggle value={role} onChange={setRole} />

          {role === "child" ? <ChildLoginForm /> : <TeacherLoginForm />}
        </div>
      </div>
    </main>
  );
}
