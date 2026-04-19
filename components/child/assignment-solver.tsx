"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitAssignmentAction, startAssignmentAction } from "@/app/(child)/kind/aufgaben/actions";
import { Button } from "@/components/ui/button";

type Item = {
  id: string;
  type: "text" | "choice";
  question: string;
  options: string[];
};

type Answer = {
  itemId: string;
  textAnswer?: string;
  selectedOptions?: number[];
};

type ItemResult = { itemId: string; isCorrect: boolean | null };

export function AssignmentSolver({
  assignmentId,
  items,
  existingAnswers,
  initialAttempts,
  maxAttempts,
}: {
  assignmentId: string;
  items: Item[];
  existingAnswers: { item_id: string; text_answer: string | null; selected_options: number[] | null }[];
  initialAttempts: number;
  maxAttempts: number;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Map<string, Answer>>(() => {
    const map = new Map<string, Answer>();
    for (const ea of existingAnswers) {
      map.set(ea.item_id, {
        itemId: ea.item_id,
        textAnswer: ea.text_answer ?? undefined,
        selectedOptions: ea.selected_options ?? undefined,
      });
    }
    return map;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ItemResult[] | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(initialAttempts);
  const [locked, setLocked] = useState(initialAttempts >= maxAttempts);

  useEffect(() => {
    startAssignmentAction(assignmentId);
  }, [assignmentId]);

  function setTextAnswer(itemId: string, text: string) {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(itemId, { itemId, textAnswer: text });
      return next;
    });
  }

  function toggleOption(itemId: string, optIdx: number) {
    setAnswers((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      const selected = existing?.selectedOptions ?? [];
      const newSelected = selected.includes(optIdx)
        ? selected.filter((i) => i !== optIdx)
        : [...selected, optIdx];
      next.set(itemId, { itemId, selectedOptions: newSelected });
      return next;
    });
  }

  function getItemResult(itemId: string): boolean | null | undefined {
    if (!results) return undefined;
    const r = results.find((r) => r.itemId === itemId);
    return r?.isCorrect;
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    const answerList = items.map((item) => {
      const a = answers.get(item.id);
      return {
        itemId: item.id,
        textAnswer: a?.textAnswer,
        selectedOptions: a?.selectedOptions,
      };
    });

    const result = await submitAssignmentAction(assignmentId, answerList);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      if (result.locked) setLocked(true);
      if (result.attemptsUsed) setAttemptsUsed(result.attemptsUsed);
    } else {
      setResults(result.results ?? null);
      setAttemptsUsed(result.attemptsUsed ?? attemptsUsed + 1);
      if (result.locked) setLocked(true);

      // Alles richtig? → Seite neu laden um Abgabe-Screen zu zeigen
      const allCorrect = result.results?.every((r) => r.isCorrect === true || r.isCorrect === null);
      if (allCorrect || result.locked) {
        setTimeout(() => router.refresh(), 2000);
      }
    }
  }

  const attemptsLeft = maxAttempts - attemptsUsed;
  const allCorrect = results?.every((r) => r.isCorrect === true || r.isCorrect === null);

  return (
    <div className="flex flex-col gap-5">
      {/* Versuche-Anzeige */}
      <div className="flex items-center justify-between glass-card rounded-2xl px-5 py-3 shadow-sm">
        <span className="text-sm font-semibold text-slate-700">
          Versuche: {attemptsUsed} / {maxAttempts}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: maxAttempts }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < attemptsUsed ? "bg-orange-400" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Gesperrt-Hinweis */}
      {locked && !allCorrect && (
        <div className="glass-card rounded-2xl p-6 text-center shadow-md border-2 border-red-200 animate-fade-in">
          <p className="text-4xl mb-3">🔒</p>
          <h3 className="text-lg font-bold text-red-700">Keine Versuche mehr</h3>
          <p className="text-sm text-slate-600 mt-1">
            Du hast alle {maxAttempts} Versuche aufgebraucht. Dein Lehrer kann sehen, wo du noch Hilfe brauchst.
          </p>
        </div>
      )}

      {/* Alles richtig */}
      {results && allCorrect && (
        <div className="glass-card rounded-2xl p-6 text-center shadow-md border-2 border-green-200 animate-fade-in">
          <p className="text-4xl mb-3">🎉</p>
          <h3 className="text-lg font-bold text-green-700">Alles richtig!</h3>
          <p className="text-sm text-slate-600 mt-1">Super gemacht!</p>
        </div>
      )}

      {/* Aufgaben */}
      {items.map((item, idx) => {
        const itemResult = getItemResult(item.id);
        const showResult = itemResult !== undefined;
        const isCorrect = itemResult === true;
        const isWrong = itemResult === false;

        let borderClass = "";
        if (showResult && isCorrect) borderClass = "border-2 border-green-300";
        else if (showResult && isWrong) borderClass = "border-2 border-red-300";

        return (
          <div
            key={item.id}
            className={`glass-card rounded-2xl p-5 shadow-md animate-fade-in ${borderClass}`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-slate-400 font-semibold">
                Aufgabe {idx + 1} — {item.type === "text" ? "Freitext" : "Multiple Choice"}
              </p>
              {showResult && isCorrect && (
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">✅ Richtig</span>
              )}
              {showResult && isWrong && (
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">❌ Falsch</span>
              )}
              {showResult && itemResult === null && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">📝 Wird geprüft</span>
              )}
            </div>

            <p className="text-base font-semibold text-slate-800 mb-4">
              {item.question}
            </p>

            {item.type === "text" ? (
              <textarea
                rows={3}
                placeholder="Deine Antwort…"
                disabled={locked}
                className="w-full rounded-xl border-2 border-orange-200 bg-orange-50/30 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                value={answers.get(item.id)?.textAnswer ?? ""}
                onChange={(e) => setTextAnswer(item.id, e.target.value)}
              />
            ) : (
              <div className="grid gap-2">
                {item.options.map((opt, optIdx) => {
                  const selected = answers.get(item.id)?.selectedOptions?.includes(optIdx) ?? false;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={locked}
                      onClick={() => toggleOption(item.id, optIdx)}
                      className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                        selected
                          ? "border-orange-400 bg-orange-50 text-orange-800 shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50/50"
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-3 text-xs font-bold ${
                        selected
                          ? "bg-orange-400 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      {/* Feedback nach Versuch: nochmal probieren oder gesperrt */}
      {results && !allCorrect && !locked && (
        <div className="glass-card rounded-2xl p-5 text-center shadow-md border border-amber-200 animate-fade-in">
          <p className="text-lg font-bold text-amber-700 mb-1">
            Noch nicht ganz richtig
          </p>
          <p className="text-sm text-slate-600">
            Du hast noch {attemptsLeft} {attemptsLeft === 1 ? "Versuch" : "Versuche"} übrig.
            Schau dir die markierten Aufgaben nochmal an!
          </p>
        </div>
      )}

      {!locked && !(results && allCorrect) && (
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg font-bold shadow-lg shadow-green-200/50 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {submitting
            ? "Wird geprüft…"
            : attemptsUsed === 0
              ? "✅ Aufgabe abgeben"
              : `🔄 Nochmal versuchen (${attemptsLeft} übrig)`}
        </Button>
      )}
    </div>
  );
}
