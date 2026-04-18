"use client";

interface BalloonProps {
  id: number;
  x: number;
  color: string;
  speed: number;
  onPop: (id: number) => void;
  popped: boolean;
}

export function Balloon({ id, x, color, speed, onPop, popped }: BalloonProps) {
  return (
    <button
      type="button"
      onClick={() => onPop(id)}
      className={`absolute bottom-0 w-16 h-20 rounded-full ${color} flex flex-col items-center justify-end ${
        popped ? "animate-balloon-pop" : "animate-balloon-rise"
      }`}
      style={
        {
          left: `${x}%`,
          "--balloon-speed": `${speed}s`,
          willChange: "transform",
        } as React.CSSProperties
      }
      aria-label="Ballon platzen lassen"
    >
      {/* Ballon-Knoten */}
      <div className="w-3 h-3 bg-slate-400 rounded-full -mb-1.5" />
    </button>
  );
}
