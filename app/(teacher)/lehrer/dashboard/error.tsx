"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-dvh grid place-items-center bg-white px-6 py-16">
      <div className="w-full max-w-md bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <h1 className="text-xl font-semibold text-red-900 mb-4">
          Dashboard-Fehler
        </h1>
        <p className="text-sm text-red-800 mb-2">{error.message}</p>
        {error.digest && (
          <p className="text-xs text-red-600 mb-4">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
        >
          Erneut versuchen
        </button>
      </div>
    </main>
  );
}
