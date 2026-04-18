"use client";

interface NumberPadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}

const digitButtonBase =
  "h-16 w-full rounded-2xl text-3xl font-semibold active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed";

export function NumberPad({
  onDigit,
  onDelete,
  onConfirm,
  disabled = false,
}: NumberPadProps) {
  return (
    <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
      {/* Row 1: 1, 2, 3 */}
      {["1", "2", "3"].map((d) => (
        <button
          key={d}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(d)}
          className={`${digitButtonBase} bg-blue-500 text-white`}
        >
          {d}
        </button>
      ))}

      {/* Row 2: 4, 5, 6 */}
      {["4", "5", "6"].map((d) => (
        <button
          key={d}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(d)}
          className={`${digitButtonBase} bg-blue-500 text-white`}
        >
          {d}
        </button>
      ))}

      {/* Row 3: 7, 8, 9 */}
      {["7", "8", "9"].map((d) => (
        <button
          key={d}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(d)}
          className={`${digitButtonBase} bg-blue-500 text-white`}
        >
          {d}
        </button>
      ))}

      {/* Row 4: Delete, 0, OK */}
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className={`${digitButtonBase} bg-red-500 text-white`}
        aria-label="Loeschen"
      >
        {"\u2190"}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit("0")}
        className={`${digitButtonBase} bg-blue-500 text-white`}
      >
        0
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={onConfirm}
        className={`${digitButtonBase} bg-green-500 text-white`}
        aria-label="Bestaetigen"
      >
        OK
      </button>
    </div>
  );
}
