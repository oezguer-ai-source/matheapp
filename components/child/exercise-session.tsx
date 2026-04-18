"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { generateExerciseAction, submitAnswerAction } from "@/app/(child)/kind/ueben/actions";
import { NumberPad } from "@/components/child/number-pad";
import { FeedbackOverlay } from "@/components/child/feedback-overlay";
import type { ClientExercise, Difficulty, SubmitAnswerResult } from "@/lib/exercises/types";

type SessionState = "loading" | "answering" | "submitting" | "feedback" | "error";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Leicht",
  medium: "Mittel",
  hard: "Schwer",
};

interface ExerciseSessionProps {
  grade: number;
}

export function ExerciseSession({ grade }: ExerciseSessionProps) {
  const router = useRouter();

  const [state, setState] = useState<SessionState>("loading");
  const [exercise, setExercise] = useState<ClientExercise | null>(null);
  const [answer, setAnswer] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [correctStreak, setCorrectStreak] = useState(0);
  const [incorrectStreak, setIncorrectStreak] = useState(0);
  const [feedback, setFeedback] = useState<SubmitAnswerResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNextExercise = useCallback(async () => {
    setState("loading");
    const result = await generateExerciseAction(grade, difficulty);
    if (result.data) {
      setExercise(result.data);
      setAnswer("");
      setState("answering");
    } else {
      setState("error");
    }
  }, [grade, difficulty]);

  useEffect(() => {
    loadNextExercise();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDigit(digit: string) {
    if (state !== "answering") return;
    setAnswer((prev) => {
      if (prev.length >= 5) return prev;
      return prev + digit;
    });
  }

  function handleDelete() {
    if (state !== "answering") return;
    setAnswer((prev) => prev.slice(0, -1));
  }

  async function handleConfirm() {
    if (answer === "" || state !== "answering" || !exercise) return;

    setState("submitting");

    const result = await submitAnswerAction({
      exerciseId: exercise.id,
      operand1: exercise.operand1,
      operand2: exercise.operand2,
      operator: exercise.operator,
      userAnswer: parseInt(answer, 10),
      currentDifficulty: difficulty,
      correctStreak,
      incorrectStreak,
    });

    if (result.data) {
      setFeedback(result.data);
      setCorrectStreak(result.data.newCorrectStreak);
      setIncorrectStreak(result.data.newIncorrectStreak);
      setDifficulty(result.data.newDifficulty);

      if (result.data.correct) {
        setCorrectCount((c) => c + 1);
      } else {
        setWrongCount((c) => c + 1);
      }

      setState("feedback");

      timeoutRef.current = setTimeout(
        () => loadNextExercise(),
        result.data.correct ? 1500 : 2000
      );
    } else {
      setState("error");
    }
  }

  function handleEndSession() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    router.push("/kind/dashboard");
    router.refresh();
  }

  // Background color based on feedback state
  let bgClass = "bg-white";
  if (state === "feedback" && feedback) {
    bgClass = feedback.correct ? "bg-green-50" : "bg-red-50";
  }

  return (
    <div className={`min-h-dvh transition-colors duration-300 ${bgClass}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          onClick={handleEndSession}
          className="bg-red-500 text-white rounded-2xl px-6 h-12 text-xl font-semibold active:scale-95 transition-transform"
        >
          Beenden
        </button>

        <div className="flex items-center gap-4 text-lg font-medium">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
            {correctCount} richtig
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
            {wrongCount} falsch
          </span>
          <span className="text-blue-600 font-semibold">
            {DIFFICULTY_LABELS[difficulty]}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center px-4 pt-8 pb-16">
        {/* Loading state */}
        {state === "loading" && (
          <p className="text-2xl text-gray-500">Aufgabe wird geladen...</p>
        )}

        {/* Exercise display + number pad (answering or submitting) */}
        {(state === "answering" || state === "submitting") && exercise && (
          <>
            <div className="text-5xl font-bold text-center mb-12">
              {exercise.operand1} {exercise.operator} {exercise.operand2} ={" "}
              <span className={answer ? "text-blue-600" : "text-gray-400"}>
                {answer || "?"}
              </span>
            </div>

            <NumberPad
              onDigit={handleDigit}
              onDelete={handleDelete}
              onConfirm={handleConfirm}
              disabled={state === "submitting"}
            />
          </>
        )}

        {/* Feedback state */}
        {state === "feedback" && feedback && (
          <>
            <div className="mb-8">
              <FeedbackOverlay
                correct={feedback.correct}
                pointsEarned={feedback.pointsEarned}
                correctAnswer={feedback.correctAnswer}
              />
            </div>

            <NumberPad
              onDigit={handleDigit}
              onDelete={handleDelete}
              onConfirm={handleConfirm}
              disabled={true}
            />
          </>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="text-center">
            <p className="text-2xl text-red-600 mb-6">
              Ein Fehler ist aufgetreten.
            </p>
            <button
              type="button"
              onClick={() => loadNextExercise()}
              className="bg-blue-500 text-white rounded-2xl px-8 h-14 text-xl font-semibold active:scale-95 transition-transform"
            >
              Erneut versuchen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
