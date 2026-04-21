"use client";

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ExitConfirmDialog({ open, onCancel, onConfirm }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-dialog-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="text-6xl mb-3">🤔</div>
        <h2 id="exit-dialog-title" className="text-2xl font-extrabold text-slate-800 mb-2">
          Wirklich aufhören?
        </h2>
        <p className="text-base text-slate-500 mb-6">
          Wenn du jetzt gehst, wird dein Ergebnis nicht gespeichert.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 text-white text-lg font-bold active:scale-95 transition-transform shadow-md"
          >
            🎈 Weiterspielen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-14 rounded-2xl bg-white text-slate-700 text-lg font-bold border border-slate-200 active:scale-95 transition-transform shadow-sm"
          >
            Ja, aufhören
          </button>
        </div>
      </div>
    </div>
  );
}
