"use client";

interface GameOverScreenProps {
  score: number;
}

export function GameOverScreen({ score }: GameOverScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh] bg-yellow-50 rounded-2xl p-8">
      <h2 className="text-5xl font-bold text-child-green">Geschafft!</h2>
      <p className="text-3xl text-gray-700">
        {score} Ballons geplatzt!
      </p>
      <a
        href="/kind/dashboard"
        className="inline-flex items-center justify-center h-16 min-h-[48px] rounded-2xl bg-child-green text-white text-2xl font-semibold px-8 active:scale-95 transition-transform"
      >
        Zurueck zum Dashboard
      </a>
    </div>
  );
}
