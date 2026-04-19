"use client";

import { useState } from "react";
import { ExerciseSession } from "@/components/child/exercise-session";
import type { Operator } from "@/lib/exercises/types";

type Topic = {
  label: string;
  emoji: string;
  operators: Operator[];
  color: string;
};

const ALL_TOPICS: Topic[] = [
  { label: "Addition", emoji: "➕", operators: ["+"], color: "from-green-400 to-emerald-500" },
  { label: "Subtraktion", emoji: "➖", operators: ["-"], color: "from-blue-400 to-cyan-500" },
  { label: "Multiplikation", emoji: "✖️", operators: ["*"], color: "from-purple-400 to-violet-500" },
  { label: "Division", emoji: "➗", operators: ["/"], color: "from-orange-400 to-red-400" },
  { label: "Gemischt", emoji: "🎲", operators: ["+", "-", "*", "/"], color: "from-pink-400 to-yellow-400" },
];

function getAvailableTopics(grade: number): Topic[] {
  if (grade <= 2) {
    // Klasse 1-2: nur + und -
    return [
      ALL_TOPICS[0], // Addition
      ALL_TOPICS[1], // Subtraktion
      { label: "Gemischt", emoji: "🎲", operators: ["+", "-"], color: "from-pink-400 to-yellow-400" },
    ];
  }
  return ALL_TOPICS;
}

export function TopicPicker({ grade }: { grade: number }) {
  const [selectedOperators, setSelectedOperators] = useState<Operator[] | null>(null);
  const topics = getAvailableTopics(grade);

  if (selectedOperators) {
    return <ExerciseSession grade={grade} operatorFilter={selectedOperators} />;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-center mb-8 animate-fade-in">
        <p className="text-5xl mb-3">📚</p>
        <h1 className="text-3xl font-extrabold text-slate-800">Was möchtest du üben?</h1>
        <p className="text-base text-slate-500 mt-2">Wähle ein Thema aus:</p>
      </div>

      <div className="grid gap-4">
        {topics.map((topic, idx) => (
          <button
            key={topic.label}
            type="button"
            onClick={() => setSelectedOperators(topic.operators)}
            className={`glass-card rounded-2xl p-6 flex items-center gap-5 shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all animate-fade-in`}
            style={{ animationDelay: `${idx * 0.08}s` }}
          >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${topic.color} flex items-center justify-center text-3xl shadow-lg`}>
              {topic.emoji}
            </div>
            <div className="text-left">
              <p className="text-xl font-bold text-slate-800">{topic.label}</p>
              <p className="text-sm text-slate-500">
                {topic.operators.length === 1
                  ? `Nur ${topic.label}-Aufgaben`
                  : "Alle Rechenarten gemischt"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
