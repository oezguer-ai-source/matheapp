"use client";

import Link from "next/link";
import { useActionState } from "react";
import { teacherLogin, type LoginActionState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlertTeacher } from "./auth-error-alert";

const initialState: LoginActionState = { error: null };

export function TeacherLoginForm() {
  const [state, action, pending] = useActionState(teacherLogin, initialState);

  return (
    <form
      action={action}
      id="login-panel-teacher"
      role="tabpanel"
      aria-labelledby="role-tab-teacher"
      className="flex flex-col gap-4"
    >
      <p className="text-base text-slate-700 text-center">
        Melden Sie sich mit Ihrer Schul-E-Mail an.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="teacher-email">E-Mail</Label>
        <Input
          id="teacher-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="name@schule.de"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="teacher-password">Passwort</Label>
        <Input
          id="teacher-password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Anmelden\u2026" : "Einloggen"}
      </Button>

      <Link
        href="/registrieren"
        className="text-sm text-slate-600 underline text-center"
      >
        Noch kein Konto? Jetzt registrieren
      </Link>

      {state.error && <AuthErrorAlertTeacher message={state.error} />}
    </form>
  );
}
