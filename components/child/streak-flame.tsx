"use client";

interface Props {
  current: number;
  best: number;
}

export function StreakFlame({ current, best }: Props) {
  const size = current >= 7 ? "text-5xl" : current >= 3 ? "text-4xl" : "text-3xl";
  const pulse = current >= 7 ? "animate-pulse" : "";
  const flame = current === 0 ? "🔥" : "🔥";
  const greyed = current === 0 ? "grayscale opacity-40" : "";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 px-4 py-2 shadow-sm border border-orange-200/60 ${greyed}`}
      title={best > 0 ? `Beste Serie: ${best} Tage` : "Starte deine Serie!"}
    >
      <span className={`${size} ${pulse} leading-none drop-shadow`}>{flame}</span>
      <div className="flex flex-col">
        <span className="text-2xl font-extrabold text-orange-700 leading-none">
          {current}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
          {current === 1 ? "Tag" : "Tage"}
        </span>
      </div>
    </div>
  );
}
