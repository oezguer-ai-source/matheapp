"use client";

import { useRef, type ChangeEvent, type KeyboardEvent, type ClipboardEvent } from "react";
import { cn } from "@/lib/utils";

export function PinInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  error?: boolean;
}) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const digits = Array.from({ length: 4 }, (_, i) => value[i] ?? "");

  function setDigit(i: number, next: string) {
    const only = next.replace(/\D/g, "").slice(0, 1);
    const arr = digits.slice();
    arr[i] = only;
    onChange(arr.join(""));
    if (only && i < 3) refs[i + 1].current?.focus();
  }

  function handleChange(i: number, e: ChangeEvent<HTMLInputElement>) {
    setDigit(i, e.target.value);
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs[i - 1].current?.focus();
      const arr = digits.slice();
      arr[i - 1] = "";
      onChange(arr.join(""));
      e.preventDefault();
    }
  }

  function handlePaste(i: number, e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 0) return;
    e.preventDefault();
    onChange(pasted.padEnd(4, "").slice(0, 4));
    const focusIndex = Math.min(pasted.length, 3);
    refs[focusIndex].current?.focus();
  }

  return (
    <div className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          autoComplete="off"
          maxLength={1}
          // NO `name` attribute on the visible digits — the hidden input below is
          // the single, canonical FormData source for the concatenated PIN value.
          // This avoids duplicate-key collisions in FormData.
          value={d}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          aria-label={`PIN-Ziffer ${i + 1} von 4`}
          aria-invalid={error || undefined}
          className={cn(
            "w-14 h-14 text-4xl font-semibold text-center tabular-nums",
            "bg-white border-2 rounded-2xl text-slate-900",
            "focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200 focus:outline-none",
            error ? "border-red-600 ring-4 ring-red-200" : "border-slate-300 hover:border-slate-400"
          )}
        />
      ))}
      {/* Single canonical FormData source for the PIN — the visible digits are unnamed. */}
      <input type="hidden" name="pin" value={value} />
    </div>
  );
}
