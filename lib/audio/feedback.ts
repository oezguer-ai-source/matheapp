// Lightweight audio helpers — reine Web-APIs, keine externen Dateien.

const SOUND_KEY = "matheapp.sound";
const TTS_KEY = "matheapp.tts";

export function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SOUND_KEY) !== "off";
}

export function setSoundEnabled(v: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_KEY, v ? "on" : "off");
}

export function getTtsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(TTS_KEY) !== "off";
}

export function setTtsEnabled(v: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TTS_KEY, v ? "on" : "off");
}

let audioCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  audioCtx = new AC();
  return audioCtx;
}

function beep(freqs: number[], durMs: number, volume = 0.15): void {
  if (!getSoundEnabled()) return;
  const ac = ctx();
  if (!ac) return;

  const now = ac.currentTime;
  freqs.forEach((f, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    osc.connect(gain);
    gain.connect(ac.destination);

    const start = now + (i * durMs) / 1000;
    const stop = start + durMs / 1000;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, stop);
    osc.start(start);
    osc.stop(stop + 0.02);
  });
}

export function playCorrect(): void {
  beep([660, 880], 140);
}

export function playWrong(): void {
  beep([220], 260, 0.1);
}

export function playPointsEarned(): void {
  beep([523, 659, 784], 110, 0.12);
}

// Text-to-Speech — Web Speech API, Deutsch, kostenlos offline im Browser
let ttsVoice: SpeechSynthesisVoice | null = null;
function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  if (ttsVoice) return ttsVoice;
  const voices = window.speechSynthesis.getVoices();
  const german = voices.find((v) => v.lang.startsWith("de"));
  ttsVoice = german ?? voices[0] ?? null;
  return ttsVoice;
}

export function speak(text: string): void {
  if (!getTtsEnabled()) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "de-DE";
  utter.rate = 0.95;
  utter.pitch = 1.05;
  const voice = pickVoice();
  if (voice) utter.voice = voice;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function exerciseToSpeech(
  operand1: number,
  operand2: number,
  operator: "+" | "-" | "*" | "/"
): string {
  const word =
    operator === "+"
      ? "plus"
      : operator === "-"
        ? "minus"
        : operator === "*"
          ? "mal"
          : "geteilt durch";
  return `${operand1} ${word} ${operand2}`;
}
