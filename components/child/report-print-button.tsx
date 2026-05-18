"use client";

/**
 * Druck-Button fuer die Eltern-Bericht-Seite.
 *
 * Loest den Browser-Druckdialog aus — von dort kann als PDF gespeichert werden
 * (keine PDF-Bibliothek noetig). Der Button selbst traegt `print:hidden`, damit
 * er im Ausdruck nicht erscheint.
 */
export function ReportPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-2xl bg-child-cta px-6 py-3 text-base font-bold text-white shadow-md transition-all hover:scale-[1.03] active:scale-[0.98]"
    >
      <span className="text-xl">🖨️</span>
      Als PDF speichern / drucken
    </button>
  );
}
