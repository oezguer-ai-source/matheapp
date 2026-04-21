"use client";

import { DinoLevel } from "./dino-svg";
import { getDinoStage } from "@/lib/avatar/levels";

interface Props {
  open: boolean;
  newLevel: number;
  onClose: () => void;
}

export function LevelUpModal({ open, newLevel, onClose }: Props) {
  if (!open) return null;

  const stage = getDinoStage(newLevel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Confetti-Dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => {
          const left = (i * 37) % 100;
          const delay = (i % 8) * 0.1;
          const color = ["#f472b6", "#fbbf24", "#60a5fa", "#4ade80", "#a78bfa"][i % 5];
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-balloon-rise"
              style={{
                left: `${left}%`,
                bottom: "-20px",
                backgroundColor: color,
                animationDelay: `${delay}s`,
                animationDuration: "3s",
              }}
            />
          );
        })}
      </div>

      <div className="relative bg-gradient-to-br from-white via-pink-50 to-amber-50 rounded-[32px] shadow-2xl max-w-sm w-full p-8 text-center border-2 border-white">
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-orange-500">
          Level Up!
        </p>
        <h2 className="text-3xl font-extrabold text-slate-800 mt-1">
          Level {newLevel}
        </h2>

        <div className="my-4 flex justify-center animate-wiggle">
          <DinoLevel level={newLevel} mood="happy" size={160} />
        </div>

        <p className="text-lg font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">
          {stage.title}
        </p>
        <p className="text-sm text-slate-600 italic mt-1 mb-6">
          {stage.callout}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 text-white text-lg font-extrabold active:scale-95 transition-transform shadow-lg"
        >
          Weiter! 🎉
        </button>
      </div>
    </div>
  );
}
