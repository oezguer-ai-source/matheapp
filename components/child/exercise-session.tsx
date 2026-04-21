"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { generateExerciseAction, submitAnswerAction } from "@/app/(child)/kind/ueben/actions";
import { NumberPad } from "@/components/child/number-pad";
import { FeedbackOverlay } from "@/components/child/feedback-overlay";
import { getHint, generateSolutionSteps } from "@/lib/exercises/solution-steps";
import {
  exerciseToSpeech,
  playCorrect,
  playWrong,
  speak,
  stopSpeaking,
} from "@/lib/audio/feedback";
import { AudioToggle } from "@/components/child/audio-toggle";
import { MiniDinoReaction } from "@/components/child/mini-dino-reaction";
import { LevelUpModal } from "@/components/child/level-up-modal";
import { fetchAvatarStateAction } from "@/lib/avatar/actions";
import type { ClientExercise, Difficulty, Operator, SubmitAnswerResult } from "@/lib/exercises/types";
import type { ExerciseFocus } from "@/lib/exercises/focus";
import type { DinoMood } from "@/components/child/dino-svg";

type SessionState = "loading" | "answering" | "submitting" | "feedback" | "error";

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; color: string }> = {
  easy: { label: "Leicht", color: "bg-green-100 text-green-700" },
  medium: { label: "Mittel", color: "bg-amber-100 text-amber-700" },
  hard: { label: "Schwer", color: "bg-red-100 text-red-700" },
};

interface ExerciseSessionProps {
  grade: number;
  operatorFilter?: Operator[];
  focus?: ExerciseFocus;
}

export function ExerciseSession({ grade, operatorFilter, focus }: ExerciseSessionProps) {
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
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  // Dino-Zustand (Begleiter)
  const [dinoLevel, setDinoLevel] = useState(1);
  const [dinoName, setDinoName] = useState("Rexi");
  const [dinoMood, setDinoMood] = useState<DinoMood>("idle");
  const [dinoCallout, setDinoCallout] = useState<string | null>(null);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dinoCalloutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchAvatarStateAction()
      .then((a) => {
        setDinoLevel(a.level);
        setDinoName(a.dinoName);
      })
      .catch(() => {});
    return () => {
      if (dinoCalloutTimerRef.current) clearTimeout(dinoCalloutTimerRef.current);
    };
  }, []);

  const loadNextExercise = useCallback(async () => {
    setState("loading");
    setShowHint(false);
    setShowSolution(false);
    stopSpeaking();
    const result = await generateExerciseAction(grade, difficulty, operatorFilter, focus);
    if (result.data) {
      setExercise(result.data);
      setAnswer("");
      setState("answering");
      speak(
        exerciseToSpeech(
          result.data.operand1,
          result.data.operand2,
          result.data.operator
        )
      );
    } else {
      setState("error");
    }
  }, [grade, difficulty, operatorFilter, focus]);

  useEffect(() => {
    loadNextExercise();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDigit(digit: string) {
    if (state !== "answering") return;
    setAnswer((prev) => (prev.length >= 5 ? prev : prev + digit));
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
      focus,
    });

    if (result.data) {
      setFeedback(result.data);
      setCorrectStreak(result.data.newCorrectStreak);
      setIncorrectStreak(result.data.newIncorrectStreak);
      setDifficulty(result.data.newDifficulty);

      if (result.data.correct) {
        setCorrectCount((c) => c + 1);
        playCorrect();
        speak("Super!");
        setDinoMood("happy");
        setDinoCallout("Super!");
      } else {
        setWrongCount((c) => c + 1);
        playWrong();
        speak(`Die richtige Antwort ist ${result.data.correctAnswer}.`);
        setDinoMood("sad");
        setDinoCallout("Macht nichts!");
      }
      if (dinoCalloutTimerRef.current) clearTimeout(dinoCalloutTimerRef.current);
      dinoCalloutTimerRef.current = setTimeout(() => {
        setDinoCallout(null);
        setDinoMood("idle");
      }, 2200);

      // Avatar-Update aus Server-Response
      if (result.data.avatar) {
        setDinoLevel(result.data.avatar.newLevel);
        if (result.data.avatar.levelUp) {
          setLevelUpTo(result.data.avatar.newLevel);
        }
      }

      setState("feedback");
      setShowSolution(false);
      // Kein Auto-Weiter — Schüler klickt selbst "Nächste Aufgabe"
    } else {
      setState("error");
    }
  }

  function handleNextExercise() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    loadNextExercise();
  }

  function handleEndSession() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    router.push("/kind/dashboard");
    router.refresh();
  }

  // Rechenweg-Schritte generieren
  const solutionSteps =
    state === "feedback" && feedback && exercise
      ? generateSolutionSteps(
          exercise.operand1,
          exercise.operand2,
          exercise.operator,
          feedback.correctAnswer
        )
      : [];

  // Hilfestellung
  const hintText =
    exercise ? getHint(exercise.operator, exercise.operand1, exercise.operand2) : "";

  // Hintergrundfarbe je nach Feedback
  let bgClass = "bg-transparent";
  if (state === "feedback" && feedback) {
    bgClass = feedback.correct ? "bg-green-50/50" : "bg-red-50/50";
  }

  const diffInfo = DIFFICULTY_LABELS[difficulty];

  return (
    <div className={`relative min-h-[calc(100dvh-56px)] transition-colors duration-300 ${bgClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          onClick={handleEndSession}
          className="bg-white/80 backdrop-blur text-slate-600 rounded-2xl px-5 h-10 text-sm font-semibold border border-slate-200 hover:bg-white active:scale-95 transition-all"
        >
          ← Zurück
        </button>

        <div className="flex items-center gap-2 sm:gap-3 text-sm font-semibold">
          <AudioToggle />
          <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full">
            ✓ {correctCount}
          </span>
          <span className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full">
            ✗ {wrongCount}
          </span>
          <span className={`px-3 py-1.5 rounded-full ${diffInfo.color} hidden sm:inline-flex`}>
            {diffInfo.label}
          </span>
        </div>
      </div>

      {/* Mini-Dino Reaktion */}
      <div className="absolute top-14 right-4 z-10 pointer-events-none">
        <MiniDinoReaction level={dinoLevel} mood={dinoMood} callout={dinoCallout} />
      </div>

      {/* Hauptbereich */}
      <div className="flex flex-col items-center justify-center px-4 pt-4 pb-8">
        {/* Laden */}
        {state === "loading" && (
          <div className="text-center animate-fade-in">
            <p className="text-5xl mb-4 animate-float">🔄</p>
            <p className="text-xl text-slate-500">Aufgabe wird geladen…</p>
          </div>
        )}

        {/* Aufgabe beantworten */}
        {(state === "answering" || state === "submitting") && exercise && (
          <div className="w-full max-w-md animate-fade-in">
            {/* Aufgabe mit Hilfe-Button */}
            <div className="glass-card rounded-3xl p-8 mb-6 shadow-lg relative">
              {/* Fragezeichen-Hilfe */}
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold flex items-center justify-center hover:bg-blue-200 transition-colors"
                aria-label="Hilfestellung anzeigen"
              >
                ?
              </button>

              <div className="text-5xl font-bold text-center text-slate-800 mb-2">
                {exercise.operand1} {exercise.operator} {exercise.operand2} ={" "}
                <span className={answer ? "text-orange-500" : "text-slate-300"}>
                  {answer || "?"}
                </span>
              </div>

              {/* Hilfestellung */}
              {showHint && (
                <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 animate-fade-in">
                  <p className="text-sm text-blue-800 flex items-start gap-2">
                    <span className="text-lg leading-none">💡</span>
                    {hintText}
                  </p>
                </div>
              )}
            </div>

            <NumberPad
              onDigit={handleDigit}
              onDelete={handleDelete}
              onConfirm={handleConfirm}
              disabled={state === "submitting"}
            />
          </div>
        )}

        {/* Feedback mit Rechenweg */}
        {state === "feedback" && feedback && exercise && (
          <div className="w-full max-w-md animate-fade-in">
            {/* Ergebnis */}
            <FeedbackOverlay
              correct={feedback.correct}
              pointsEarned={feedback.pointsEarned}
              correctAnswer={feedback.correctAnswer}
            />

            {/* Rechenweg */}
            <div className="glass-card rounded-2xl p-6 mt-4 shadow-md">
              <button
                type="button"
                onClick={() => setShowSolution(!showSolution)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  📝 Rechenweg anzeigen
                </span>
                <span className="text-slate-400 text-lg">
                  {showSolution ? "▲" : "▼"}
                </span>
              </button>

              {showSolution && (
                <div className="mt-4 space-y-2 animate-fade-in">
                  {solutionSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`px-4 py-2.5 rounded-xl text-sm ${
                        step.highlight
                          ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 font-bold text-green-800"
                          : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="text-slate-400 mr-2 text-xs">Schritt {idx + 1}</span>
                      {step.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nächste Aufgabe Button */}
            <button
              type="button"
              onClick={handleNextExercise}
              className="w-full mt-4 h-14 rounded-2xl bg-gradient-to-r from-orange-400 to-yellow-400 text-white text-lg font-bold shadow-lg shadow-orange-200/50 hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              Nächste Aufgabe →
            </button>
          </div>
        )}

        {/* Fehler */}
        {state === "error" && (
          <div className="text-center animate-fade-in">
            <p className="text-5xl mb-4">😕</p>
            <p className="text-xl text-red-600 mb-6">
              Ein Fehler ist aufgetreten.
            </p>
            <button
              type="button"
              onClick={() => loadNextExercise()}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl px-8 h-14 text-lg font-bold shadow-lg active:scale-95 transition-all"
            >
              Erneut versuchen
            </button>
          </div>
        )}
      </div>

      <LevelUpModal
        open={levelUpTo !== null}
        newLevel={levelUpTo ?? 1}
        dinoName={dinoName}
        onClose={() => setLevelUpTo(null)}
      />
    </div>
  );
}
