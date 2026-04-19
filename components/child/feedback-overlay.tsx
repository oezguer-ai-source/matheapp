"use client";

interface FeedbackOverlayProps {
  correct: boolean;
  pointsEarned: number;
  correctAnswer: number;
}

export function FeedbackOverlay({
  correct,
  pointsEarned,
  correctAnswer,
}: FeedbackOverlayProps) {
  if (correct) {
    return (
      <div
        className="glass-card rounded-3xl p-8 text-center shadow-lg border-2 border-green-200 animate-fade-in"
        data-testid="feedback-overlay"
      >
        <p className="text-5xl mb-3">🎉</p>
        <p className="text-2xl font-extrabold text-green-700">
          Richtig!
        </p>
        <p className="text-lg font-semibold text-green-600 mt-1">
          +{pointsEarned} Punkte
        </p>
      </div>
    );
  }

  return (
    <div
      className="glass-card rounded-3xl p-8 text-center shadow-lg border-2 border-red-200 animate-fade-in"
      data-testid="feedback-overlay"
    >
      <p className="text-5xl mb-3">🤔</p>
      <p className="text-2xl font-extrabold text-red-700">
        Leider falsch
      </p>
      <p className="text-lg text-slate-600 mt-2">
        Die richtige Antwort ist:{" "}
        <span className="font-bold text-slate-900 text-2xl">{correctAnswer}</span>
      </p>
    </div>
  );
}
