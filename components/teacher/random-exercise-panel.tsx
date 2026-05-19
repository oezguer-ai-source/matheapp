"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import {
  generateMathAssignmentItems,
  type MathAssignmentItem,
} from "@/lib/exercises/assignment-items";
import type { ExerciseFocus } from "@/lib/exercises/focus";
import type { Difficulty, Grade } from "@/lib/exercises/types";

/**
 * Lehrer-Panel zum Generieren von Zufalls-Mathe-Aufgaben fuer den
 * Aufgaben-Builder. Zwei Modi:
 *  - "grade": Klassenstufe + Schwierigkeit (RANGES-basiert)
 *  - "focus": Themen-Fokus (Einmaleins, Geteilt, Plus/Minus bis N)
 *
 * Die generierten Items werden ueber `onGenerate` an den Builder uebergeben.
 */

type Mode = "grade" | "focus";
type FocusKind = ExerciseFocus["kind"];

const GRADES: { value: Grade; label: string }[] = [
  { value: 1, label: "Klasse 1" },
  { value: 2, label: "Klasse 2" },
  { value: 3, label: "Klasse 3" },
  { value: 4, label: "Klasse 4" },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Leicht" },
  { value: "medium", label: "Mittel" },
  { value: "hard", label: "Schwer" },
];

const FOCUS_KINDS: { value: FocusKind; label: string }[] = [
  { value: "times_table", label: "Einmaleins (·)" },
  { value: "divide_by", label: "Geteilt durch (:)" },
  { value: "add_up_to", label: "Plus bis …" },
  { value: "sub_up_to", label: "Minus bis …" },
];

/** Fuer times_table / divide_by waehlbare Faktoren 1–12. */
const FACTORS = Array.from({ length: 12 }, (_, i) => i + 1);
/** Fuer add_up_to / sub_up_to waehlbarer Zahlenraum. */
const MAX_VALUES = [10, 20, 50, 100, 1000];

export function RandomExercisePanel({
  onGenerate,
}: {
  onGenerate: (items: MathAssignmentItem[]) => void;
}) {
  const [mode, setMode] = useState<Mode>("grade");
  const [count, setCount] = useState(5);
  const [grade, setGrade] = useState<Grade>(2);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [focusKind, setFocusKind] = useState<FocusKind>("times_table");
  const [factor, setFactor] = useState(7);
  const [maxValue, setMaxValue] = useState(20);
  const [error, setError] = useState<string | null>(null);

  const usesFactor = focusKind === "times_table" || focusKind === "divide_by";

  /** Einheitliches Styling fuer die nativen Selects in diesem Panel. */
  const selectClass =
    "h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 transition-colors focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200";

  function buildFocus(): ExerciseFocus {
    if (focusKind === "times_table") return { kind: "times_table", factor };
    if (focusKind === "divide_by") return { kind: "divide_by", factor };
    if (focusKind === "add_up_to") return { kind: "add_up_to", max: maxValue };
    return { kind: "sub_up_to", max: maxValue };
  }

  function handleGenerate() {
    setError(null);
    const safeCount = Math.round(count);
    if (!Number.isInteger(safeCount) || safeCount < 1 || safeCount > 50) {
      setError("Bitte eine Anzahl zwischen 1 und 50 angeben.");
      return;
    }
    try {
      const items =
        mode === "focus"
          ? generateMathAssignmentItems({
              count: safeCount,
              focus: buildFocus(),
            })
          : generateMathAssignmentItems({
              count: safeCount,
              grade,
              difficulty,
            });
      onGenerate(items);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Die Aufgaben konnten nicht erzeugt werden."
      );
    }
  }

  return (
    <Card className="border-indigo-100 bg-indigo-50/40">
      <CardContent className="pt-5 grid gap-4">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-indigo-900">
              Zufalls-Mathe-Aufgaben generieren
            </h3>
            <p className="text-xs text-indigo-700/80 mt-0.5">
              Erzeugt Rechenaufgaben, bei denen die Schüler eine Zahl
              eingeben.
            </p>
          </div>
        </div>

        {/* Anzahl */}
        <div className="grid gap-1.5 sm:max-w-[12rem]">
          <Label htmlFor="re-count" className="text-xs text-slate-600">
            Anzahl Aufgaben
          </Label>
          <Input
            id="re-count"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="bg-white"
          />
        </div>

        {/* Modus-Umschalter */}
        <div className="grid gap-1.5">
          <span className="text-xs text-slate-600">Aufgaben-Quelle</span>
          <div
            className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "grade"}
              onClick={() => setMode("grade")}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === "grade"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Klassenstufe & Schwierigkeit
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "focus"}
              onClick={() => setMode("focus")}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === "focus"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Themen-Fokus
            </button>
          </div>
        </div>

        {/* Modus-spezifische Eingaben — abgesetzt in eigenem Block */}
        <div className="grid gap-3 rounded-lg border border-indigo-100 bg-white p-3 sm:grid-cols-2">
          {mode === "grade" ? (
            <>
              {/* Klassenstufe */}
              <div className="grid gap-1.5">
                <Label htmlFor="re-grade" className="text-xs text-slate-600">
                  Klassenstufe
                </Label>
                <select
                  id="re-grade"
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value) as Grade)}
                  className={selectClass}
                >
                  {GRADES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Schwierigkeit */}
              <div className="grid gap-1.5">
                <Label htmlFor="re-diff" className="text-xs text-slate-600">
                  Schwierigkeit
                </Label>
                <select
                  id="re-diff"
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as Difficulty)
                  }
                  className={selectClass}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Themen-Fokus */}
              <div className="grid gap-1.5">
                <Label htmlFor="re-focus" className="text-xs text-slate-600">
                  Thema
                </Label>
                <select
                  id="re-focus"
                  value={focusKind}
                  onChange={(e) =>
                    setFocusKind(e.target.value as FocusKind)
                  }
                  className={selectClass}
                >
                  {FOCUS_KINDS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Faktor oder Zahlenraum */}
              <div className="grid gap-1.5">
                <Label htmlFor="re-param" className="text-xs text-slate-600">
                  {usesFactor ? "Faktor" : "Zahlenraum bis"}
                </Label>
                <select
                  id="re-param"
                  value={usesFactor ? factor : maxValue}
                  onChange={(e) =>
                    usesFactor
                      ? setFactor(Number(e.target.value))
                      : setMaxValue(Number(e.target.value))
                  }
                  className={selectClass}
                >
                  {(usesFactor ? FACTORS : MAX_VALUES).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <Button
          type="button"
          onClick={handleGenerate}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Sparkles className="h-4 w-4" />
          {count} Aufgabe{count === 1 ? "" : "n"} generieren &amp; hinzufügen
        </Button>
      </CardContent>
    </Card>
  );
}
