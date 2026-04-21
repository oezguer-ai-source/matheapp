"use client";

import { DinoLevel, type DinoMood } from "./dino-svg";

interface Props {
  level: number;
  mood: DinoMood;
  callout?: string | null;
}

export function MiniDinoReaction({ level, mood, callout }: Props) {
  const animation =
    mood === "happy"
      ? "animate-wiggle"
      : mood === "sad"
        ? ""
        : "animate-float";

  return (
    <div className="flex items-center gap-2">
      {callout && (
        <div className="relative bg-white rounded-2xl rounded-br-sm px-3 py-1.5 text-xs font-bold text-slate-700 shadow-md border border-slate-100 animate-fade-in max-w-[160px]">
          {callout}
        </div>
      )}
      <div className={animation}>
        <DinoLevel level={level} mood={mood} size={64} />
      </div>
    </div>
  );
}
