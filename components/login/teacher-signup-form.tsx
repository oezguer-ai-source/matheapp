"use client";

import Link from "next/link";
import { useActionState } from "react";
import { teacherSignup, type SignupActionState } from "@/app/registrieren/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlertTeacher } from "./auth-error-alert";

const initialState: SignupActionState = { error: null };

export function TeacherSignupForm() {
  const [state, action, pending] = useActionState(teacherSignup, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="rounded-2xl bg-green-50 border border-green-200 p-6">
          <h2 className="text-lg font-semibold text-green-900 mb-2">
            Registrierung erfolgreich!
          </h2>
          <p className="text-sm text-green-800">
            Wir haben Ihnen eine Bestaetigungs-E-Mail gesendet. Bitte klicken
            Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.
          </p>
        </div>
        <Link href="/login" className="text-sm text-slate-600 underline">
          Zum Login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-base text-slate-700 text-center">
        Erstellen Sie Ihr Lehrkraft-Konto.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="signup-name">Name</Label>
        <Input
          id="signup-name"
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Vor- und Nachname"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="signup-email">E-Mail</Label>
        <Input
          id="signup-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="name@schule.de"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="signup-password">Passwort (mindestens 8 Zeichen)</Label>
        <Input
          id="signup-password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Konto wird erstellt\u2026" : "Konto erstellen"}
      </Button>

      <Link href="/login" className="text-sm text-slate-600 underline text-center">
        Bereits registriert? Zum Login
      </Link>

      {state.error && <AuthErrorAlertTeacher message={state.error} />}
    </form>
  );
}
