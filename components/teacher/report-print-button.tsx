"use client";

/**
 * Druck-Button fuer die Lehrer-Berichte (Klassen- und Schueler-Bericht).
 *
 * Loest den Browser-Druckdialog aus — von dort kann als PDF gespeichert werden
 * (keine PDF-Bibliothek noetig). Der Button traegt `print:hidden`, damit er im
 * Ausdruck nicht erscheint. Professioneller Lehrer-Look (Indigo-Palette).
 */
export function ReportPrintButton({
  label = "Als PDF speichern / drucken",
}: {
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.552c.377.046.752.097 1.126.153A2.212 2.212 0 0 1 18 8.653v4.097A2.25 2.25 0 0 1 15.75 15h-.241l.305 1.984A1.75 1.75 0 0 1 14.084 19H5.915a1.75 1.75 0 0 1-1.73-2.016L4.492 15H4.25A2.25 2.25 0 0 1 2 12.75V8.653c0-1.082.775-2.034 1.874-2.198.374-.056.75-.107 1.127-.153L5 6.25v-3.5Zm8.5 3.397a41.533 41.533 0 0 0-7 0V2.75a.25.25 0 0 1 .25-.25h6.5a.25.25 0 0 1 .25.25v3.397ZM6.616 13l-.661 4.302a.25.25 0 0 0 .247.288h8.169a.25.25 0 0 0 .247-.288L13.953 13H6.616Z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </button>
  );
}
