"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Balloon } from "./balloon";
import { GameOverScreen } from "./game-over-screen";
import { ExitConfirmDialog } from "./exit-confirm-dialog";
import { saveGameScoreAction } from "@/app/(child)/kind/spiel/actions";

interface BalloonData {
  id: number;
  x: number;
  color: string;
  speed: number;
  popped: boolean;
  createdAt: number;
}

const GAME_DURATION = 60;
const SPAWN_INTERVAL = 1100;
const MAX_BALLOONS = 7;
const COLORS = [
  "bg-child-yellow",
  "bg-child-green",
  "bg-child-blue",
  "bg-child-red",
  "bg-pink-400",
  "bg-purple-400",
  "bg-orange-400",
];

type GameState = "idle" | "playing" | "over";

export function BalloonGame() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>("idle");
  const [balloons, setBalloons] = useState<BalloonData[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [saved, setSaved] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const nextBalloonId = useRef(0);
  const spawnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllIntervals = useCallback(() => {
    if (spawnIntervalRef.current) {
      clearInterval(spawnIntervalRef.current);
      spawnIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const handleStartGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setBalloons([]);
    setSaved(false);
    nextBalloonId.current = 0;
    setGameState("playing");
  };

  const spawnBalloon = useCallback(() => {
    setBalloons((prev) => {
      if (prev.filter((b) => !b.popped).length >= MAX_BALLOONS) return prev;

      const newBalloon: BalloonData = {
        id: nextBalloonId.current++,
        x: Math.random() * 75 + 7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speed: Math.random() * 3 + 8,
        popped: false,
        createdAt: Date.now(),
      };
      return [...prev, newBalloon];
    });
  }, []);

  const handlePop = useCallback((id: number) => {
    setBalloons((prev) => {
      const balloon = prev.find((b) => b.id === id);
      if (!balloon || balloon.popped) return prev;
      return prev.map((b) => (b.id === id ? { ...b, popped: true } : b));
    });
    setScore((prev) => prev + 1);
    setTimeout(() => {
      setBalloons((prev) => prev.filter((b) => b.id !== id));
    }, 300);
  }, []);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearAllIntervals();
          setGameState("over");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [gameState, clearAllIntervals]);

  useEffect(() => {
    if (gameState !== "playing") return;
    spawnIntervalRef.current = setInterval(spawnBalloon, SPAWN_INTERVAL);
    return () => {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
    };
  }, [gameState, spawnBalloon]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const cleanupInterval = setInterval(() => {
      setBalloons((prev) =>
        prev.filter((b) => {
          if (b.popped) return true;
          const elapsed = (Date.now() - b.createdAt) / 1000;
          return elapsed < b.speed;
        })
      );
    }, 1000);
    return () => clearInterval(cleanupInterval);
  }, [gameState]);

  useEffect(() => {
    if (gameState === "over" && !saved) {
      setSaved(true);
      saveGameScoreAction("balloon", score).catch(() => {});
    }
  }, [gameState, saved, score]);

  // Browser-Reload / Tab-Schliessen: Warnung während des Spiels
  useEffect(() => {
    if (gameState !== "playing") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [gameState]);

  const handleExitClick = () => {
    if (gameState === "playing") {
      setShowExitDialog(true);
    } else {
      router.push("/kind/spiel");
    }
  };

  const confirmExit = () => {
    clearAllIntervals();
    setShowExitDialog(false);
    router.push("/kind/spiel");
  };

  if (gameState === "idle") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh] p-6">
        <h1 className="text-5xl font-extrabold text-child-blue">🎈 Ballonplatzen</h1>
        <p className="text-xl text-slate-600 text-center max-w-md">
          Tippe auf die Ballons, um sie zu platzen. Du hast {GAME_DURATION} Sekunden!
        </p>
        <button
          type="button"
          onClick={handleStartGame}
          className="h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-white text-3xl font-bold px-10 active:scale-95 transition-transform shadow-lg"
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
        gameKey="balloon"
        score={score}
        scoreUnit="Ballons"
        onRestart={handleStartGame}
      />
    );
  }

  return (
    <>
      <div className="relative w-full h-[80vh] overflow-hidden bg-gradient-to-b from-sky-200 to-sky-400 rounded-2xl">
        {/* Exit-Button */}
        <button
          type="button"
          onClick={handleExitClick}
          aria-label="Spiel verlassen"
          className="absolute top-4 left-4 w-12 h-12 rounded-full bg-white/80 text-slate-700 text-2xl font-bold flex items-center justify-center z-20 active:scale-95 shadow-md"
        >
          ✕
        </button>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-3xl font-bold bg-white/80 rounded-xl px-4 py-2 z-10">
          {score}
        </div>
        <div className="absolute top-4 right-4 text-3xl font-bold bg-white/80 rounded-xl px-4 py-2 z-10">
          {timeLeft}s
        </div>
        {balloons.map((balloon) => (
          <Balloon
            key={balloon.id}
            id={balloon.id}
            x={balloon.x}
            color={balloon.color}
            speed={balloon.speed}
            onPop={handlePop}
            popped={balloon.popped}
          />
        ))}
      </div>

      <ExitConfirmDialog
        open={showExitDialog}
        onCancel={() => setShowExitDialog(false)}
        onConfirm={confirmExit}
      />
    </>
  );
}
