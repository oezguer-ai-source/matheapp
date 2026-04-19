"use client";

import { useState, useActionState, useRef, useEffect } from "react";
import { addStudentAction, type StudentActionState } from "@/app/(teacher)/lehrer/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: StudentActionState = { error: null };

export function AddStudentForm({ classId }: { classId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addStudentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // Automatisch generierter Benutzername
  const username =
    firstName && lastName
      ? `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, ".")
      : "";

  // PIN aus Geburtsdatum (TTMM)
  const pinPreview = birthDate
    ? `${birthDate.split("-")[2]}${birthDate.split("-")[1]}`
    : "";

  // Formular zurücksetzen bei Erfolg
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setFirstName("");
      setLastName("");
      setBirthDate("");
      setOpen(false);
      state.success = false;
    }
  }, [state]);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="default">
        + Schüler hinzufügen
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="bg-white rounded-xl border border-slate-200 p-5 max-w-md"
    >
      <h3 className="text-base font-semibold text-slate-900 mb-4">
        Neuen Schüler hinzufügen
      </h3>

      <input type="hidden" name="classId" value={classId} />

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="student-firstname">Vorname</Label>
          <Input
            id="student-firstname"
            type="text"
            name="firstName"
            placeholder="z. B. Mia"
            required
            autoFocus
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="student-lastname">Nachname</Label>
          <Input
            id="student-lastname"
            type="text"
            name="lastName"
            placeholder="z. B. Müller"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="student-birthdate">Geburtsdatum</Label>
          <Input
            id="student-birthdate"
            type="date"
            name="birthDate"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>
      </div>

      {/* Vorschau der Login-Daten */}
      {username && pinPreview && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
          <p className="text-slate-500 mb-1">Login-Daten für den Schüler:</p>
          <p className="text-slate-900">
            <span className="font-medium">Benutzername:</span>{" "}
            <span className="font-mono">{username}</span>
          </p>
          <p className="text-slate-900">
            <span className="font-medium">PIN:</span>{" "}
            <span className="font-mono">{pinPreview}</span>
          </p>
        </div>
      )}

      {state.error && (
        <p className="text-sm text-red-600 mt-3">{state.error}</p>
      )}

      <div className="flex gap-2 mt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Wird erstellt…" : "Hinzufügen"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOpen(false);
            setFirstName("");
            setLastName("");
            setBirthDate("");
          }}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
