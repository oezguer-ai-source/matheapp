"use client";

import { useState, useActionState, useEffect } from "react";
import { sendMessageAction, type MessageActionState } from "@/app/(teacher)/lehrer/nachrichten/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type ClassItem = { id: string; name: string };

const initialState: MessageActionState = { error: null };

export function MessageComposer({ classes }: { classes: ClassItem[] }) {
  const [state, formAction, pending] = useActionState(sendMessageAction, initialState);
  const [targetType, setTargetType] = useState<"class" | "student">("class");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [students, setStudents] = useState<{ user_id: string; display_name: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Schüler laden wenn Klasse gewählt und targetType = "student"
  useEffect(() => {
    if (targetType === "student" && selectedClassId) {
      setLoadingStudents(true);
      fetch(`/api/lehrer/klasse/${selectedClassId}/schueler`)
        .then((res) => res.json())
        .then((data) => {
          setStudents(data.students ?? []);
          setSelectedStudentId("");
        })
        .finally(() => setLoadingStudents(false));
    }
  }, [targetType, selectedClassId]);

  // Reset bei Erfolg
  if (state.success) {
    state.success = false;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="grid gap-4">
          {/* Empfänger-Typ */}
          <div className="grid gap-1.5">
            <Label>Empfänger</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetType("class")}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  targetType === "class"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                An Klasse
              </button>
              <button
                type="button"
                onClick={() => setTargetType("student")}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  targetType === "student"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                An Schüler
              </button>
            </div>
          </div>

          <input type="hidden" name="targetType" value={targetType} />

          {/* Klasse wählen */}
          <div className="grid gap-1.5">
            <Label htmlFor="msg-class">Klasse</Label>
            <select
              id="msg-class"
              name="classId"
              required
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Klasse wählen…</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Schüler wählen (nur bei Direktnachricht) */}
          {targetType === "student" && selectedClassId && (
            <div className="grid gap-1.5">
              <Label htmlFor="msg-student">Schüler</Label>
              {loadingStudents ? (
                <p className="text-sm text-slate-500">Lade Schüler…</p>
              ) : (
                <select
                  id="msg-student"
                  name="studentId"
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="">Schüler wählen…</option>
                  {students.map((s) => (
                    <option key={s.user_id} value={s.user_id}>
                      {s.display_name
                        .split(".")
                        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                        .join(" ")}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Betreff */}
          <div className="grid gap-1.5">
            <Label htmlFor="msg-subject">Betreff (optional)</Label>
            <Input
              id="msg-subject"
              name="subject"
              placeholder="z. B. Hausaufgaben diese Woche"
            />
          </div>

          {/* Nachricht */}
          <div className="grid gap-1.5">
            <Label htmlFor="msg-body">Nachricht</Label>
            <textarea
              id="msg-body"
              name="body"
              rows={4}
              required
              placeholder="Ihre Nachricht…"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          {state.success === false && !state.error && pending === false && (
            <p className="text-sm text-green-600">Nachricht gesendet!</p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Wird gesendet…" : "Nachricht senden"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
