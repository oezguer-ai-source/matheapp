"use client";

interface NumberPadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}

const digitButtonBase =
  "h-16 w-full rounded-2xl text-3xl font-bold text-white shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-md";

// Ziffern: kühler Kinder-Verlauf, Löschen: warm, OK: grün-türkis.
const digitClass = `${digitButtonBase} bg-child-cool shadow-cyan-200/50`;
const deleteClass = `${digitButtonBase} bg-child-warm shadow-orange-200/50`;
const confirmClass = `${digitButtonBase} bg-child-go shadow-emerald-200/60`;

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
          className={digitClass}
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
          className={digitClass}
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
          className={digitClass}
        >
          {d}
        </button>
      ))}

      {/* Row 4: Delete, 0, OK */}
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className={deleteClass}
        aria-label="Loeschen"
      >
        {"\u2190"}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit("0")}
        className={digitClass}
      >
        0
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={onConfirm}
        className={confirmClass}
        aria-label="Bestaetigen"
      >
        OK
      </button>
    </div>
  );
}
