"use client";

import { useState } from "react";
import { ExerciseSession } from "@/components/child/exercise-session";
import type { Operator } from "@/lib/exercises/types";
import type { ExerciseFocus } from "@/lib/exercises/focus";

type Category = {
  id: "add" | "sub" | "mul" | "div" | "mixed";
  label: string;
  emoji: string;
  color: string;
  operators: Operator[];
};

const CATEGORIES: Category[] = [
  { id: "add", label: "Addition", emoji: "➕", color: "from-green-400 to-emerald-500", operators: ["+"] },
  { id: "sub", label: "Subtraktion", emoji: "➖", color: "from-blue-400 to-cyan-500", operators: ["-"] },
  { id: "mul", label: "Multiplikation", emoji: "✖️", color: "from-purple-400 to-violet-500", operators: ["*"] },
  { id: "div", label: "Division", emoji: "➗", color: "from-orange-400 to-red-400", operators: ["/"] },
  { id: "mixed", label: "Gemischt", emoji: "🎲", color: "from-pink-400 to-yellow-400", operators: ["+", "-", "*", "/"] },
];

type SubTopic =
  | { kind: "all" }
  | { kind: "focus"; focus: ExerciseFocus; label: string };

function getCategories(grade: number): Category[] {
  if (grade <= 2) {
    return [
      CATEGORIES[0],
      CATEGORIES[1],
      { ...CATEGORIES[4], operators: ["+", "-"] },
    ];
  }
  return CATEGORIES;
}

function getSubTopics(cat: Category, grade: number): SubTopic[] {
  const all: SubTopic = { kind: "all" };
  switch (cat.id) {
    case "add": {
      const ranges = grade <= 1 ? [10, 20] : grade === 2 ? [20, 100] : [100, 1000];
      return [
        all,
        ...ranges.map(
          (max) =>
            ({
              kind: "focus",
              focus: { kind: "add_up_to", max: max as 10 | 20 | 50 | 100 | 1000 },
              label: `Bis ${max}`,
            }) satisfies SubTopic
        ),
      ];
    }
    case "sub": {
      const ranges = grade <= 1 ? [10, 20] : grade === 2 ? [20, 100] : [100, 1000];
      return [
        all,
        ...ranges.map(
          (max) =>
            ({
              kind: "focus",
              focus: { kind: "sub_up_to", max: max as 10 | 20 | 50 | 100 | 1000 },
              label: `Bis ${max}`,
            }) satisfies SubTopic
        ),
      ];
    }
    case "mul": {
      return [
        all,
        ...Array.from({ length: 9 }, (_, i) => i + 2).map(
          (factor) =>
            ({
              kind: "focus",
              focus: { kind: "times_table", factor },
              label: `Einmaleins mit ${factor}`,
            }) satisfies SubTopic
        ),
      ];
    }
    case "div": {
      return [
        all,
        ...Array.from({ length: 9 }, (_, i) => i + 2).map(
          (factor) =>
            ({
              kind: "focus",
              focus: { kind: "divide_by", factor },
              label: `Teilen durch ${factor}`,
            }) satisfies SubTopic
        ),
      ];
    }
    case "mixed":
      return [all];
  }
}

export function TopicPicker({ grade }: { grade: number }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [chosen, setChosen] = useState<{
    operators: Operator[];
    focus?: ExerciseFocus;
  } | null>(null);
  const categories = getCategories(grade);

  if (chosen) {
    return (
      <ExerciseSession
        grade={grade}
        operatorFilter={chosen.operators}
        focus={chosen.focus}
      />
    );
  }

  // Stufe 2: Sub-Topic wählen
  if (category) {
    const subs = getSubTopics(category, grade);
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className="mb-4 text-sm text-slate-500 hover:text-slate-700"
        >
          ← Zurück
        </button>
        <div className="text-center mb-6 animate-fade-in">
          <div className={`inline-flex w-20 h-20 rounded-3xl bg-gradient-to-br ${category.color} items-center justify-center text-4xl shadow-lg mb-3`}>
            {category.emoji}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800">{category.label}</h1>
          <p className="text-base text-slate-500 mt-2">Was möchtest du üben?</p>
        </div>

        <div className="grid gap-3">
          {subs.map((sub, idx) => {
            const label = sub.kind === "all" ? "🎯 Alle gemischt" : sub.label;
            const hint =
              sub.kind === "all"
                ? "Aufgaben von leicht bis schwer, automatisch angepasst"
                : "Gezielt diese Art üben";
            return (
              <button
                key={sub.kind === "all" ? "all" : sub.label}
                type="button"
                onClick={() =>
                  setChosen({
                    operators: category.operators,
                    focus: sub.kind === "focus" ? sub.focus : undefined,
                  })
                }
                className="glass-card rounded-2xl p-5 flex items-center justify-between shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all animate-fade-in"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="text-left">
                  <p className="text-lg font-bold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">{hint}</p>
                </div>
                <span className="text-xl text-slate-400">→</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Stufe 1: Kategorie wählen
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-center mb-8 animate-fade-in">
        <p className="text-5xl mb-3">📚</p>
        <h1 className="text-3xl font-extrabold text-slate-800">Was möchtest du üben?</h1>
        <p className="text-base text-slate-500 mt-2">Wähle ein Thema aus:</p>
      </div>

      <div className="grid gap-4">
        {categories.map((cat, idx) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              if (cat.id === "mixed") {
                setChosen({ operators: cat.operators });
              } else {
                setCategory(cat);
              }
            }}
            className="glass-card rounded-2xl p-6 flex items-center gap-5 shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all animate-fade-in"
            style={{ animationDelay: `${idx * 0.08}s` }}
          >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-3xl shadow-lg shrink-0`}>
              {cat.emoji}
            </div>
            <div className="text-left flex-1">
              <p className="text-xl font-bold text-slate-800">{cat.label}</p>
              <p className="text-sm text-slate-500">
                {cat.id === "mixed" ? "Alle Rechenarten gemischt" : "Mit Unterthemen üben"}
              </p>
            </div>
            {cat.id !== "mixed" && <span className="text-xl text-slate-400">→</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
