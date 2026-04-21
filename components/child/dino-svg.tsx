"use client";

import type { ReactElement } from "react";

export type DinoMood = "idle" | "happy" | "sad" | "sleepy";

interface Props {
  level: number;
  mood?: DinoMood;
  size?: number;
  className?: string;
}

// Farbpalette pro Level (Körper, Bauch, Akzent)
const PALETTES: Array<{ body: string; belly: string; accent: string; eye: string }> = [
  { body: "#fef3c7", belly: "#fffbeb", accent: "#fbbf24", eye: "#78350f" }, // 1 — Ei (warm cream)
  { body: "#bbf7d0", belly: "#ecfccb", accent: "#fb923c", eye: "#134e4a" }, // 2 — Baby
  { body: "#86efac", belly: "#d9f99d", accent: "#f97316", eye: "#052e16" }, // 3 — Klein
  { body: "#4ade80", belly: "#bef264", accent: "#ea580c", eye: "#052e16" }, // 4 — Grün
  { body: "#fb7185", belly: "#fda4af", accent: "#fde047", eye: "#7f1d1d" }, // 5 — Feuer
  { body: "#7dd3fc", belly: "#e0f2fe", accent: "#a78bfa", eye: "#164e63" }, // 6 — Eis
  { body: "#c4b5fd", belly: "#ede9fe", accent: "#f9a8d4", eye: "#4c1d95" }, // 7 — Flügel
  { body: "#fcd34d", belly: "#fef3c7", accent: "#f59e0b", eye: "#713f12" }, // 8 — Gold
  { body: "#a78bfa", belly: "#ddd6fe", accent: "#fbbf24", eye: "#2e1065" }, // 9 — König
  { body: "#f472b6", belly: "#fbcfe8", accent: "#fde047", eye: "#831843" }, // 10 — Legendär
];

function eyesFor(mood: DinoMood, eyeColor: string, cx: number): ReactElement {
  // Zwei Augen nebeneinander, Abstand = cx (center-offset)
  if (mood === "happy") {
    return (
      <g stroke={eyeColor} strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d={`M ${70 - cx - 3} 82 Q ${70 - cx} 78 ${70 - cx + 3} 82`} />
        <path d={`M ${70 + cx - 3} 82 Q ${70 + cx} 78 ${70 + cx + 3} 82`} />
      </g>
    );
  }
  if (mood === "sad") {
    return (
      <g fill={eyeColor}>
        <circle cx={70 - cx} cy={84} r="2.5" />
        <circle cx={70 + cx} cy={84} r="2.5" />
        <path
          d={`M ${70 - cx - 4} 78 Q ${70 - cx} 80 ${70 - cx + 4} 78`}
          stroke={eyeColor}
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d={`M ${70 + cx - 4} 78 Q ${70 + cx} 80 ${70 + cx + 4} 78`}
          stroke={eyeColor}
          strokeWidth="1.5"
          fill="none"
        />
      </g>
    );
  }
  if (mood === "sleepy") {
    return (
      <g stroke={eyeColor} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1={70 - cx - 3} y1="82" x2={70 - cx + 3} y2="82" />
        <line x1={70 + cx - 3} y1="82" x2={70 + cx + 3} y2="82" />
        <text x="100" y="60" fontSize="14" fill={eyeColor}>
          z
        </text>
        <text x="108" y="52" fontSize="10" fill={eyeColor}>
          z
        </text>
      </g>
    );
  }
  return (
    <g fill={eyeColor}>
      <circle cx={70 - cx} cy={82} r="3" />
      <circle cx={70 + cx} cy={82} r="3" />
      <circle cx={70 - cx - 0.8} cy={81} r="0.9" fill="white" />
      <circle cx={70 + cx - 0.8} cy={81} r="0.9" fill="white" />
    </g>
  );
}

export function DinoLevel({ level, mood = "idle", size = 120, className = "" }: Props) {
  const lv = Math.max(1, Math.min(10, Math.round(level)));
  const p = PALETTES[lv - 1];

  // Level 1: Ei
  if (lv === 1) {
    return (
      <svg
        viewBox="0 0 140 140"
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
      >
        <ellipse cx="70" cy="78" rx="42" ry="52" fill={p.body} />
        <ellipse cx="70" cy="84" rx="30" ry="38" fill={p.belly} opacity="0.7" />
        {[
          [55, 50],
          [85, 60],
          [60, 95],
          [90, 100],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4" fill={p.accent} opacity="0.8" />
        ))}
        {mood === "happy" && (
          <path
            d="M 55 78 Q 70 82 85 78"
            stroke={p.eye}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </svg>
    );
  }

  const bodyWidth = 38 + lv * 1.5;
  const bodyHeight = 44 + lv * 1.5;
  const hasHorn = lv >= 3;
  const hasTailSpikes = lv >= 4;
  const hasFireTongue = lv === 5;
  const hasIceCrystal = lv === 6;
  const hasWings = lv >= 7;
  const hasGoldShine = lv === 8 || lv === 10;
  const hasCrown = lv === 9 || lv === 10;
  const hasSparkles = lv === 10;

  return (
    <svg
      viewBox="0 0 140 140"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Flügel hinten */}
      {hasWings && (
        <g opacity="0.85">
          <path
            d="M 35 75 Q 15 60 22 85 Q 30 82 38 82 Z"
            fill={p.accent}
            stroke={p.eye}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M 105 75 Q 125 60 118 85 Q 110 82 102 82 Z"
            fill={p.accent}
            stroke={p.eye}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Schwanz */}
      <path
        d={`M 108 95 Q 128 95 130 75 Q 132 65 120 68`}
        fill={p.body}
        stroke={p.eye}
        strokeOpacity="0.3"
        strokeWidth="1"
      />

      {/* Stacheln am Schwanz */}
      {hasTailSpikes && (
        <g fill={p.accent}>
          <polygon points="120,72 124,62 128,72" />
          <polygon points="126,78 131,68 134,80" />
        </g>
      )}

      {/* Beine */}
      <ellipse cx="55" cy="118" rx="10" ry="8" fill={p.body} />
      <ellipse cx="85" cy="118" rx="10" ry="8" fill={p.body} />
      <circle cx="50" cy="122" r="2" fill={p.eye} opacity="0.3" />
      <circle cx="90" cy="122" r="2" fill={p.eye} opacity="0.3" />

      {/* Körper */}
      <ellipse
        cx="70"
        cy="90"
        rx={bodyWidth}
        ry={bodyHeight * 0.6}
        fill={p.body}
      />
      {/* Bauch */}
      <ellipse cx="70" cy="100" rx={bodyWidth * 0.65} ry="18" fill={p.belly} />

      {/* Kopf */}
      <circle cx="70" cy="75" r={24 + lv * 0.5} fill={p.body} />

      {/* Stacheln am Rücken — mehr bei höherem Level */}
      <g fill={p.accent}>
        {Array.from({ length: Math.min(5, 1 + Math.floor(lv / 2)) }).map((_, i) => {
          const x = 75 + i * 8;
          return (
            <polygon
              key={i}
              points={`${x},${70 - i * 0.5} ${x + 4},${62 - i * 0.5} ${x + 8},${70 - i * 0.5}`}
            />
          );
        })}
      </g>

      {/* Horn */}
      {hasHorn && (
        <polygon
          points="66,52 70,40 74,52"
          fill={p.accent}
          stroke={p.eye}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      )}

      {/* Augen */}
      {eyesFor(mood, p.eye, 8)}

      {/* Nase/Mund */}
      <ellipse cx="70" cy="92" rx="5" ry="3" fill={p.belly} stroke={p.eye} strokeWidth="0.8" />
      <circle cx="67" cy="92" r="0.8" fill={p.eye} />
      <circle cx="73" cy="92" r="0.8" fill={p.eye} />

      {hasFireTongue && (
        <g>
          <path
            d="M 68 95 Q 70 108 72 95 Q 76 100 74 112 Q 70 116 66 112 Q 64 100 68 95 Z"
            fill="#f97316"
          />
          <path
            d="M 69 98 Q 70 106 71 98 Q 73 102 72 108 Q 70 110 68 108 Z"
            fill="#fde047"
          />
        </g>
      )}

      {hasIceCrystal && (
        <g fill="#e0f2fe" stroke={p.eye} strokeWidth="1">
          <polygon points="46,58 52,50 58,58 52,66" />
          <polygon points="92,60 98,52 104,60 98,68" />
        </g>
      )}

      {/* Krone */}
      {hasCrown && (
        <g>
          <polygon
            points="55,48 62,35 70,44 78,35 85,48"
            fill="#fde047"
            stroke="#b45309"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="62" cy="40" r="2" fill="#f472b6" />
          <circle cx="70" cy="42" r="2.5" fill="#60a5fa" />
          <circle cx="78" cy="40" r="2" fill="#4ade80" />
        </g>
      )}

      {/* Gold-Glanz */}
      {hasGoldShine && (
        <g fill="#fef9c3" opacity="0.9">
          <circle cx="60" cy="75" r="2" />
          <circle cx="80" cy="80" r="1.5" />
          <circle cx="70" cy="100" r="2" />
        </g>
      )}

      {/* Sparkles Legendär */}
      {hasSparkles && (
        <g fill="#fde047">
          <polygon points="30,60 32,55 34,60 32,65" />
          <polygon points="110,55 112,50 114,55 112,60" />
          <polygon points="25,100 27,95 29,100 27,105" />
          <polygon points="115,105 117,100 119,105 117,110" />
        </g>
      )}
    </svg>
  );
}
