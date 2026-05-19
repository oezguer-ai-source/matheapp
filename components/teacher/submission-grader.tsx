"use client";

import { useState, useTransition } from "react";
import { Check, X, CircleDashed } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { gradeSubmissionAction } from "@/app/(teacher)/lehrer/aufgaben/actions";

/**
 * Ein Item samt der Schueler-Antwort, das im Grader bewertet werden soll.
 * `answerId` ist die ID des submission_answers-Datensatzes (zum Speichern).
 */
export type GraderItem = {
  itemId: string;
  answerId: string | null;
  itemType: string;
  question: string;
  options: string[] | null;
  correctOptions: number[] | null;
  // Bei 'math': die korrekte Zahl der generierten Aufgabe.
  correctNumber: number | null;
  // Schueler-Antwort:
  selectedOptions: number[] | null;
  textAnswer: string | null;
  // Bestehende Bewertung (falls bereits korrigiert):
  isCorrect: boolean | null;
  teacherComment: string | null;
};

type Props = {
  submissionId: string;
  studentName: string;
  /** ISO-String, falls bereits korrigiert — sonst null. */
  gradedAt: string | null;
  /** Gespeichertes Gesamt-Feedback (falls vorhanden). */
  teacherFeedback: string | null;
  items: GraderItem[];
};

/**
 * Prueft, ob eine MC-Antwort korrekt ist: die gewaehlten Optionen muessen
 * exakt der Menge der korrekten Optionen entsprechen.
 */
function isChoiceCorrect(
  correct: number[] | null | undefined,
  selected: number[] | null | undefined
): boolean {
  const c = [...(correct ?? [])].sort((a, b) => a - b);
  const s = [...(selected ?? [])].sort((a, b) => a - b);
  if (c.length !== s.length || c.length === 0) return false;
  return c.every((v, i) => v === s[i]);
}

type RowState = {
  isCorrect: boolean | null;
  comment: string;
};

/**
 * Prueft, ob eine math-Antwort korrekt ist: die vom Schueler eingegebene
 * Zahl (text_answer) muss exakt der korrekten Zahl entsprechen.
 */
function isMathCorrect(
  correctNumber: number | null | undefined,
  textAnswer: string | null | undefined
): boolean {
  if (correctNumber == null) return false;
  const raw = textAnswer?.trim();
  if (!raw) return false;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) && parsed === correctNumber;
}

/**
 * Ausgangszustand pro Antwort.
 *  - Bereits korrigiert (gradedAt gesetzt): gespeicherte Werte uebernehmen.
 *  - MC-Item, noch unkorrigiert: is_correct automatisch vorbefuellen.
 *  - math-Item, noch unkorrigiert: is_correct aus Schueler-Zahl vs. korrekter
 *    Zahl vorbefuellen (Lehrer kann uebersteuern).
 *  - Freitext / unbekannter Typ: leer/unbewertet starten.
 */
function initialRow(item: GraderItem, alreadyGraded: boolean): RowState {
  if (alreadyGraded) {
    return {
      isCorrect: item.isCorrect,
      comment: item.teacherComment ?? "",
    };
  }
  if (item.itemType === "choice") {
    return {
      isCorrect: isChoiceCorrect(item.correctOptions, item.selectedOptions),
      comment: "",
    };
  }
  if (item.itemType === "math") {
    return {
      isCorrect: isMathCorrect(item.correctNumber, item.textAnswer),
      comment: "",
    };
  }
  // Freitext und unbekannte Typen: defensiv unbewertet starten.
  return { isCorrect: null, comment: "" };
}

export function SubmissionGrader({
  submissionId,
  studentName,
  gradedAt,
  teacherFeedback,
  items,
}: Props) {
  const alreadyGraded = gradedAt != null;

  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const initial: Record<string, RowState> = {};
    for (const item of items) {
      if (!item.answerId) continue;
      initial[item.answerId] = initialRow(item, alreadyGraded);
    }
    return initial;
  });
  const [feedback, setFeedback] = useState(teacherFeedback ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(alreadyGraded);
  const [isPending, startTransition] = useTransition();

  const gradableItems = items.filter((it) => it.answerId != null);

  function setRow(answerId: string, patch: Partial<RowState>) {
    setSaved(false);
    setError(null);
    setRows((prev) => ({
      ...prev,
      [answerId]: { ...prev[answerId], ...patch },
    }));
  }

  function handleSave() {
    setError(null);
    const answers = gradableItems.map((item) => {
      const row = rows[item.answerId as string];
      return {
        answerId: item.answerId as string,
        isCorrect: row?.isCorrect ?? null,
        teacherComment: row?.comment.trim() ? row.comment.trim() : null,
      };
    });

    startTransition(async () => {
      const result = await gradeSubmissionAction({
        submissionId,
        teacherFeedback: feedback.trim() ? feedback.trim() : null,
        answers,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  // Fortschritts-Zaehler fuer die Kopfzeile.
  const gradedCount = gradableItems.filter(
    (it) => rows[it.answerId as string]?.isCorrect != null
  ).length;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        {/* Kopfzeile */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="mr-auto">
            <span className="text-sm font-semibold text-slate-900">
              {studentName}
            </span>
            <span className="ml-2 text-xs text-slate-400">
              {gradedCount}/{gradableItems.length} bewertet
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              saved
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                saved ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {saved ? "Korrigiert" : "Noch nicht korrigiert"}
          </span>
        </div>

        {/* Antworten */}
        <ul className="space-y-3 border-t border-slate-100 pt-3">
          {items.map((item, idx) => {
            const row = item.answerId ? rows[item.answerId] : undefined;
            const opts = item.options ?? [];
            const typeLabel =
              item.itemType === "text"
                ? "Freitext"
                : item.itemType === "choice"
                  ? "Multiple Choice"
                  : item.itemType === "math"
                    ? "Mathe-Aufgabe"
                    : "Aufgabe";

            // Farb-Akzent der Reihe je nach Bewertungs-Zustand.
            const accent =
              row?.isCorrect === true
                ? "border-emerald-200 bg-emerald-50/40"
                : row?.isCorrect === false
                  ? "border-red-200 bg-red-50/40"
                  : "border-slate-200 bg-slate-50/60";

            return (
              <li
                key={item.itemId}
                className={`rounded-lg border p-3.5 ${
                  item.answerId ? accent : "border-slate-200 bg-slate-50/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600">
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {typeLabel}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-900">
                  {item.question}
                </p>

                {/* Schueler-Antwort */}
                {!item.answerId ? (
                  <p className="mt-2 text-sm italic text-slate-400">
                    Keine Antwort abgegeben.
                  </p>
                ) : (
                  <>
                    {item.itemType === "choice" ? (
                      <div className="mt-2 space-y-1">
                        {opts.map((opt, optIdx) => {
                          const chosen = (item.selectedOptions ?? []).includes(
                            optIdx
                          );
                          const isCorrectOpt = (
                            item.correctOptions ?? []
                          ).includes(optIdx);
                          return (
                            <div
                              key={optIdx}
                              className={`text-sm px-2 py-1 rounded flex items-center gap-2 ${
                                chosen
                                  ? "bg-indigo-50 text-indigo-800 font-medium"
                                  : "text-slate-500"
                              }`}
                            >
                              <span className="text-xs w-12 shrink-0">
                                {chosen ? "gewählt" : ""}
                              </span>
                              <span>{opt}</span>
                              {isCorrectOpt && (
                                <span className="text-green-600 text-xs">
                                  ✓ korrekt
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : item.itemType === "math" ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">Antwort:</span>
                        <span className="rounded-md bg-white border border-slate-200 px-2.5 py-1 text-sm font-medium text-slate-800">
                          {item.textAnswer?.trim() || (
                            <span className="text-slate-400">keine</span>
                          )}
                        </span>
                        <span className="text-xs text-slate-500">
                          Korrekt:{" "}
                          <span className="font-semibold text-green-700">
                            {item.correctNumber ?? "—"}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 rounded-md bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">
                        {item.textAnswer?.trim() || (
                          <span className="text-slate-400">keine Antwort</span>
                        )}
                      </div>
                    )}

                    {/* Bewertung */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3">
                      <span className="text-xs font-medium text-slate-500">
                        Bewertung:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRow(item.answerId as string, { isCorrect: true })
                        }
                        aria-pressed={row?.isCorrect === true}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                          row?.isCorrect === true
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Richtig
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRow(item.answerId as string, { isCorrect: false })
                        }
                        aria-pressed={row?.isCorrect === false}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                          row?.isCorrect === false
                            ? "bg-red-600 border-red-600 text-white"
                            : "bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-700"
                        }`}
                      >
                        <X className="h-3.5 w-3.5" />
                        Falsch
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRow(item.answerId as string, { isCorrect: null })
                        }
                        aria-pressed={row?.isCorrect == null}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                          row?.isCorrect == null
                            ? "bg-slate-600 border-slate-600 text-white"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <CircleDashed className="h-3.5 w-3.5" />
                        Offen
                      </button>
                    </div>

                    {/* Kommentar */}
                    <textarea
                      value={row?.comment ?? ""}
                      onChange={(e) =>
                        setRow(item.answerId as string, {
                          comment: e.target.value,
                        })
                      }
                      placeholder="Kommentar zu dieser Antwort (optional)"
                      rows={2}
                      maxLength={2000}
                      className="mt-2.5 w-full text-sm rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    />
                  </>
                )}
              </li>
            );
          })}
        </ul>

        {/* Gesamt-Feedback */}
        <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3.5">
          <label
            htmlFor="grader-feedback"
            className="text-xs font-semibold text-indigo-900"
          >
            Gesamt-Feedback an den Schüler
          </label>
          <textarea
            id="grader-feedback"
            value={feedback}
            onChange={(e) => {
              setFeedback(e.target.value);
              setSaved(false);
              setError(null);
            }}
            placeholder="Rückmeldung zur gesamten Abgabe (optional)"
            rows={3}
            maxLength={2000}
            className="mt-1.5 w-full text-sm rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
        </div>

        {error && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || gradableItems.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isPending ? "Speichert…" : "Korrektur speichern"}
          </Button>
          {saved && !isPending && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <Check className="h-4 w-4" />
              Gespeichert.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
