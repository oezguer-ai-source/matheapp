"use client";

interface GameOverScreenProps {
  gameKey: string;
  score: number;
  scoreUnit: string;
  onRestart: () => void;
}

export function GameOverScreen({ score, scoreUnit, onRestart }: GameOverScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh] bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-8 m-4">
      <div className="text-7xl animate-wiggle">🏆</div>
      <h2 className="text-5xl font-extrabold text-slate-800">Geschafft!</h2>
      <div className="text-center">
        <p className="text-xl text-slate-500">Dein Ergebnis</p>
        <p className="text-6xl font-extrabold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
          {score}
        </p>
        <p className="text-lg text-slate-600">{scoreUnit}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 text-white text-xl font-bold active:scale-95 transition-transform shadow-md"
        >
          🔁 Nochmal
        </button>
        <a
          href="/kind/spiel"
          className="flex-1 h-14 rounded-2xl bg-white text-slate-700 text-xl font-bold flex items-center justify-center active:scale-95 transition-transform shadow-md border border-slate-200"
        >
          🎮 Andere Spiele
        </a>
      </div>
    </div>
  );
}
