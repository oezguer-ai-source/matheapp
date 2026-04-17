"use client";

import { useState } from "react";
import { RoleToggle, type LoginRole } from "@/components/login/role-toggle";
import { ChildLoginForm } from "@/components/login/child-login-form";
import { TeacherLoginForm } from "@/components/login/teacher-login-form";

export default function LoginClient() {
  const [role, setRole] = useState<LoginRole>("child");

  return (
    <main className="min-h-dvh grid place-items-center bg-white px-6 py-16">
      <div className="w-full max-w-md bg-slate-100 rounded-3xl p-8 lg:p-12 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900 text-center mb-6">
          Willkommen bei Matheapp
        </h1>

        <RoleToggle value={role} onChange={setRole} />

        {role === "child" ? <ChildLoginForm /> : <TeacherLoginForm />}
      </div>
    </main>
  );
}
