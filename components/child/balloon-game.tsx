"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Balloon } from "./balloon";
import { GameOverScreen } from "./game-over-screen";
import { startGameAction } from "@/app/(child)/kind/spiel/actions";

interface BalloonGameProps {
  currentPoints: number;
}

interface BalloonData {
  id: number;
  x: number;
  color: string;
  speed: number;
  popped: boolean;
  createdAt: number;
}

const GAME_DURATION = 75;
const SPAWN_INTERVAL = 800;
const MAX_BALLOONS = 12;
const COLORS = [
  "bg-child-yellow",
  "bg-child-green",
  "bg-child-blue",
  "bg-child-red",
  "bg-pink-400",
  "bg-purple-400",
  "bg-orange-400",
];

type GameState = "idle" | "starting" | "playing" | "over";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BalloonGame({ currentPoints }: BalloonGameProps) {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [balloons, setBalloons] = useState<BalloonData[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [error, setError] = useState<string | null>(null);

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

  const handleStartGame = async () => {
    setGameState("starting");
    setError(null);

    try {
      const result = await startGameAction();
      if (!result.success) {
        setError(result.error ?? "Spiel konnte nicht gestartet werden.");
        setGameState("idle");
        return;
      }

      setScore(0);
      setTimeLeft(GAME_DURATION);
      setBalloons([]);
      nextBalloonId.current = 0;
      setGameState("playing");
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
      setGameState("idle");
    }
  };

  const spawnBalloon = useCallback(() => {
    setBalloons((prev) => {
      if (prev.filter((b) => !b.popped).length >= MAX_BALLOONS) return prev;

      const newBalloon: BalloonData = {
        id: nextBalloonId.current++,
        x: Math.random() * 80 + 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speed: Math.random() * 4 + 4,
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

    // Remove popped balloon after pop animation (300ms)
    setTimeout(() => {
      setBalloons((prev) => prev.filter((b) => b.id !== id));
    }, 300);
  }, []);

  // Timer countdown
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

  // Balloon spawning
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

  // Cleanup: remove balloons that finished their rise animation
  useEffect(() => {
    if (gameState !== "playing") return;

    const cleanupInterval = setInterval(() => {
      setBalloons((prev) =>
        prev.filter((b) => {
          if (b.popped) return true; // popped balloons are handled by handlePop timeout
          const elapsed = (Date.now() - b.createdAt) / 1000;
          return elapsed < b.speed;
        })
      );
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, [gameState]);

  // Idle / Starting screen
  if (gameState === "idle" || gameState === "starting") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh]">
        <h1 className="text-5xl font-bold text-child-blue">Ballonplatzen!</h1>
        <p className="text-2xl text-gray-600 text-center">
          Platze so viele Ballons wie moeglich!
        </p>
        {error && (
          <p className="text-lg text-red-600 bg-red-50 rounded-xl px-4 py-2">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleStartGame}
          disabled={gameState === "starting"}
          className="h-16 rounded-2xl bg-child-green text-white text-3xl font-semibold px-8 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {gameState === "starting" ? "Starte..." : "Spiel starten"}
        </button>
      </div>
    );
  }

  // Game Over screen
  if (gameState === "over") {
    return <GameOverScreen score={score} />;
  }

  // Playing screen
  return (
    <div className="relative w-full h-[80vh] overflow-hidden bg-gradient-to-b from-sky-200 to-sky-400 rounded-2xl">
      {/* Score counter */}
      <div className="absolute top-4 left-4 text-3xl font-bold bg-white/80 rounded-xl px-4 py-2 z-10">
        {score}
      </div>

      {/* Timer */}
      <div className="absolute top-4 right-4 text-3xl font-bold bg-white/80 rounded-xl px-4 py-2 z-10">
        {timeLeft}s
      </div>

      {/* Balloons */}
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
  );
}
