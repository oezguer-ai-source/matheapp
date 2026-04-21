"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GameOverScreen } from "./game-over-screen";
import { ExitConfirmDialog } from "./exit-confirm-dialog";
import { saveGameScoreAction } from "@/app/(child)/kind/spiel/actions";

interface Props {
  grade: number;
}

interface Task {
  a: number;
  b: number;
  op: "+" | "-" | "×" | "÷";
  answer: number;
  choices: number[];
}

const GAME_DURATION = 60;

type GameState = "idle" | "playing" | "over";

function pickOps(grade: number): Array<"+" | "-" | "×" | "÷"> {
  if (grade <= 1) return ["+", "-"];
  if (grade === 2) return ["+", "-", "×"];
  return ["+", "-", "×", "÷"];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeTask(grade: number): Task {
  const ops = pickOps(grade);
  const op = ops[randInt(0, ops.length - 1)];
  const ceiling = grade <= 1 ? 20 : grade === 2 ? 50 : grade === 3 ? 100 : 100;

  let a = 0;
  let b = 0;
  let answer = 0;

  if (op === "+") {
    a = randInt(1, ceiling);
    b = randInt(1, ceiling);
    answer = a + b;
  } else if (op === "-") {
    a = randInt(1, ceiling);
    b = randInt(1, a);
    answer = a - b;
  } else if (op === "×") {
    const limit = grade <= 2 ? 5 : 10;
    a = randInt(2, limit);
    b = randInt(2, limit);
    answer = a * b;
  } else {
    const limit = grade <= 2 ? 5 : 10;
    b = randInt(2, limit);
    answer = randInt(2, limit);
    a = b * answer;
  }

  const choices = new Set<number>();
  choices.add(answer);
  while (choices.size < 4) {
    const delta = randInt(-5, 5);
    const candidate = Math.max(0, answer + (delta === 0 ? 1 : delta));
    if (candidate !== answer) choices.add(candidate);
  }
  const shuffled = Array.from(choices).sort(() => Math.random() - 0.5);

  return { a, b, op, answer, choices: shuffled };
}

export function QuickMathGame({ grade }: Props) {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>("idle");
  const [task, setTask] = useState<Task | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [saved, setSaved] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleStart = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setTask(makeTask(grade));
    setFeedback(null);
    setSaved(false);
    setGameState("playing");
  };

  const handleAnswer = useCallback(
    (choice: number) => {
      if (!task || feedback) return;
      if (choice === task.answer) {
        setFeedback("correct");
        setScore((s) => s + 1);
        setTimeout(() => {
          setTask(makeTask(grade));
          setFeedback(null);
        }, 300);
      } else {
        setFeedback("wrong");
        setTimeout(() => {
          setFeedback(null);
        }, 500);
      }
    },
    [task, feedback, grade]
  );

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setGameState("over");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === "over" && !saved) {
      setSaved(true);
      saveGameScoreAction("quickmath", score).catch(() => {});
    }
  }, [gameState, saved, score]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [gameState]);

  const confirmExit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowExitDialog(false);
    router.push("/kind/spiel");
  };

  if (gameState === "idle") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh] p-6">
        <h1 className="text-5xl font-extrabold text-orange-500">⚡ Schnellrechnen</h1>
        <p className="text-xl text-slate-600 text-center max-w-md">
          Löse so viele Aufgaben wie möglich in {GAME_DURATION} Sekunden!
        </p>
        <button
          type="button"
          onClick={handleStart}
          className="h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 text-white text-3xl font-bold px-10 active:scale-95 transition-transform shadow-lg"
        >
          Los geht&apos;s!
        </button>
        <a href="/kind/spiel" className="text-sm text-slate-400 hover:text-slate-600">
          ← Zurück zur Übersicht
        </a>
      </div>
    );
  }

  if (gameState === "over") {
    return (
      <GameOverScreen
        gameKey="quickmath"
        score={score}
        scoreUnit="Aufgaben"
        onRestart={handleStart}
      />
    );
  }

  if (!task) return null;

  return (
    <div className="flex flex-col min-h-[80vh] p-4 gap-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowExitDialog(true)}
          aria-label="Spiel verlassen"
          className="w-12 h-12 rounded-full bg-white text-slate-700 text-2xl font-bold flex items-center justify-center shadow-md border border-slate-200 active:scale-95"
        >
          ✕
        </button>
        <div className="text-3xl font-extrabold bg-orange-100 text-orange-700 rounded-xl px-4 py-2">
          ✓ {score}
        </div>
        <div className="text-3xl font-extrabold bg-sky-100 text-sky-700 rounded-xl px-4 py-2">
          ⏱ {timeLeft}s
        </div>
      </div>

      <div
        className={`flex-1 flex items-center justify-center rounded-3xl shadow-md transition-colors ${
          feedback === "correct"
            ? "bg-green-100"
            : feedback === "wrong"
              ? "bg-red-100"
              : "bg-white"
        }`}
      >
        <p className="text-7xl sm:text-8xl font-extrabold text-slate-800 tracking-tight">
          {task.a} {task.op} {task.b} = ?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {task.choices.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => handleAnswer(c)}
            disabled={feedback !== null}
            className="h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-white text-4xl font-extrabold active:scale-95 transition-transform shadow-md disabled:opacity-60"
          >
            {c}
          </button>
        ))}
      </div>

      <ExitConfirmDialog
        open={showExitDialog}
        onCancel={() => setShowExitDialog(false)}
        onConfirm={confirmExit}
      />
    </div>
  );
}
