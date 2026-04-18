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
      <div className="bg-green-100 rounded-2xl p-8 text-center" data-testid="feedback-overlay">
        <p className="text-4xl font-semibold text-green-700 animate-bounce">
          Richtig! +{pointsEarned} Punkte
        </p>
      </div>
    );
  }

  return (
    <div className="bg-red-100 rounded-2xl p-8 text-center" data-testid="feedback-overlay">
      <p className="text-4xl font-semibold text-red-700">
        Leider falsch. Die Antwort ist: {correctAnswer}
      </p>
    </div>
  );
}
