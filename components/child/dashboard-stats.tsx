import { MINIGAME_THRESHOLD } from "@/lib/config/rewards";

/* ---------- ProgressBar ---------- */

interface ProgressBarProps {
  currentPoints: number;
}

export function ProgressBar({ currentPoints }: ProgressBarProps) {
  const progress = Math.min((currentPoints / MINIGAME_THRESHOLD) * 100, 100);
  const remaining = MINIGAME_THRESHOLD - currentPoints;
  const unlocked = currentPoints >= MINIGAME_THRESHOLD;

  return (
    <div className="w-full flex flex-col gap-2">
      <p className="text-xl font-medium text-slate-700">
        {currentPoints}/{MINIGAME_THRESHOLD} Punkte bis zum Spiel
      </p>

      {/* Track */}
      <div className="w-full h-6 bg-slate-200 rounded-full overflow-hidden">
        {/* Fill */}
        <div
          className="h-full bg-child-yellow rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={currentPoints}
          aria-valuemin={0}
          aria-valuemax={MINIGAME_THRESHOLD}
        />
      </div>

      {unlocked ? (
        <p className="text-xl font-semibold text-child-green">
          Spiel freigeschaltet!
        </p>
      ) : (
        <p className="text-xl text-slate-600">
          Noch {remaining} Punkte!
        </p>
      )}
    </div>
  );
}

/* ---------- DashboardStats ---------- */

interface DashboardStatsProps {
  totalPoints: number;
  exerciseCount: number;
  gradeLevel: number;
  displayName: string;
}

export function DashboardStats({
  totalPoints,
  exerciseCount,
  gradeLevel,
  displayName,
}: DashboardStatsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Greeting */}
      <h1 className="text-4xl font-semibold text-slate-900">
        Hallo, {displayName}!
      </h1>

      {/* Grade badge */}
      <span className="text-2xl font-medium text-child-blue">
        Klasse {gradeLevel}
      </span>

      {/* Stats card */}
      <div className="bg-yellow-50 rounded-2xl p-6 flex flex-col gap-2">
        <p className="text-3xl font-bold text-slate-900">
          {totalPoints} Punkte
        </p>
        <p className="text-xl text-slate-700">
          {exerciseCount} Aufgaben geloest
        </p>
      </div>
    </div>
  );
}
