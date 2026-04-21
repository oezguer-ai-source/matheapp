"use client";

import { useEffect, useState } from "react";
import {
  getSoundEnabled,
  setSoundEnabled,
  getTtsEnabled,
  setTtsEnabled,
  stopSpeaking,
} from "@/lib/audio/feedback";

export function AudioToggle() {
  const [sound, setSound] = useState(true);
  const [tts, setTts] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSound(getSoundEnabled());
    setTts(getTtsEnabled());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          const next = !sound;
          setSound(next);
          setSoundEnabled(next);
        }}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-base shadow-sm border transition-colors ${
          sound
            ? "bg-white text-slate-700 border-slate-200"
            : "bg-slate-100 text-slate-300 border-slate-200"
        }`}
        aria-label={sound ? "Ton aus" : "Ton an"}
        title={sound ? "Ton aus" : "Ton an"}
      >
        {sound ? "🔊" : "🔇"}
      </button>
      <button
        type="button"
        onClick={() => {
          const next = !tts;
          setTts(next);
          setTtsEnabled(next);
          if (!next) stopSpeaking();
        }}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-base shadow-sm border transition-colors ${
          tts
            ? "bg-white text-slate-700 border-slate-200"
            : "bg-slate-100 text-slate-300 border-slate-200"
        }`}
        aria-label={tts ? "Vorlesen aus" : "Vorlesen an"}
        title={tts ? "Vorlesen aus" : "Vorlesen an"}
      >
        {tts ? "🗣️" : "🤫"}
      </button>
    </div>
  );
}
