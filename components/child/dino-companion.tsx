"use client";

import { DinoLevel, type DinoMood } from "./dino-svg";
import { getDinoStage, progressInLevel, xpForNextLevel } from "@/lib/avatar/levels";

interface Props {
  level: number;
  xp: number;
  dinoName: string;
  currentStreak: number;
  displayName: string;
}

function deriveMood(currentStreak: number, lastActiveOffsetDays: number | null): DinoMood {
  if (lastActiveOffsetDays !== null && lastActiveOffsetDays >= 2) return "sleepy";
  if (currentStreak >= 2) return "happy";
  return "idle";
}

export function DinoCompanion({
  level,
  xp,
  dinoName,
  currentStreak,
  displayName,
}: Props) {
  const stage = getDinoStage(level);
  const progress = progressInLevel(xp, level);
  const next = xpForNextLevel(level);
  const mood = deriveMood(currentStreak, null);

  const firstName = displayName.split(" ")[0];

  return (
    <div className="relative glass-card rounded-3xl p-5 mb-6 shadow-lg shadow-orange-100/30 animate-fade-in overflow-hidden">
      {/* Pastel-Blobs im Hintergrund */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
        <div className="absolute -top-10 -right-8 w-36 h-36 rounded-full bg-pink-200/40 blur-2xl" />
        <div className="absolute -bottom-10 -left-8 w-40 h-40 rounded-full bg-sky-200/40 blur-2xl" />
      </div>

      <div className="relative flex items-center gap-4">
        {/* Dino */}
        <div className="shrink-0 animate-float">
          <DinoLevel level={level} mood={mood} size={120} />
        </div>

        {/* Sprechblase + XP-Bar */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
            Level {level} · {stage.title}
          </p>
          <p className="text-lg font-extrabold text-slate-800 leading-tight">
            {firstName}, dein {dinoName}!
          </p>
          <p className="text-sm text-slate-600 mt-0.5 italic">
            &bdquo;{stage.callout}&ldquo;
          </p>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">
                {next === null
                  ? "Maximales Level erreicht!"
                  : `${progress.earned} / ${progress.needed} XP`}
              </span>
              {next !== null && (
                <span className="font-bold text-emerald-600">
                  Level {level + 1} →
                </span>
              )}
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-400 via-orange-400 to-yellow-400 transition-all duration-700"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
