"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import {
  deleteStudentAction,
  type StudentActionState,
} from "@/app/(teacher)/lehrer/actions";
import { Button } from "@/components/ui/button";

const initialState: StudentActionState = { error: null };

interface Props {
  studentUserId: string;
  classId: string;
  studentName: string;
}

/**
 * "Entfernen"-Button mit Bestaetigungsdialog fuer das endgueltige Loeschen
 * eines Schuelers (inkl. aller seiner Daten ueber DB-Cascade).
 */
export function DeleteStudentButton({
  studentUserId,
  classId,
  studentName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteStudentAction,
    initialState
  );
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Bei Erfolg Dialog schliessen (die Zeile verschwindet durch revalidatePath).
  useEffect(() => {
    if (state.success) {
      setOpen(false);
      state.success = false;
    }
  }, [state]);

  // Fokus beim Oeffnen auf "Abbrechen" setzen + Escape schliesst den Dialog.
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Entfernen
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-student-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2
                  id="delete-student-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Schüler entfernen
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Möchten Sie{" "}
                  <span className="font-semibold text-slate-900">
                    {studentName}
                  </span>{" "}
                  wirklich entfernen?
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-red-100 bg-red-50/70 p-3 text-sm">
              <p className="font-semibold text-red-700">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <p className="mt-1 text-red-600/90">
                Der Schüler-Zugang und <strong>alle</strong> dazugehörigen
                Daten — Lernfortschritt, Aufgaben-Abgaben und Nachrichten —
                werden unwiderruflich gelöscht.
              </p>
            </div>

            {state.error && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {state.error}
              </p>
            )}

            <form action={formAction} className="mt-5 flex justify-end gap-2">
              <input
                type="hidden"
                name="studentUserId"
                value={studentUserId}
              />
              <input type="hidden" name="classId" value={classId} />
              <Button
                ref={cancelRef}
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-300"
              >
                {pending ? "Wird entfernt…" : "Endgültig entfernen"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
