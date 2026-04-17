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

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-base text-slate-700 text-center">
        Legen Sie ein Konto an, um Ihre Klasse zu verwalten.
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

      {/* D-13a: atomic school + first-class creation fields */}
      <div className="grid gap-2">
        <Label htmlFor="signup-school">Name der Schule</Label>
        <Input
          id="signup-school"
          type="text"
          name="schoolName"
          autoComplete="organization"
          placeholder="z. B. Grundschule Musterweg"
          required
          minLength={2}
          maxLength={100}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="signup-class">Name Ihrer Klasse</Label>
        <Input
          id="signup-class"
          type="text"
          name="className"
          autoComplete="off"
          placeholder="z. B. 3a"
          required
          minLength={2}
          maxLength={100}
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
