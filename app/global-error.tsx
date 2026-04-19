"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "center",
            padding: "2rem",
            background: "#fef2f2",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              background: "#fff",
              border: "1px solid #fecaca",
              borderRadius: "16px",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <h1 style={{ color: "#991b1b", fontSize: "1.25rem", marginTop: 0 }}>
              Ein Fehler ist aufgetreten
            </h1>
            <p style={{ color: "#7f1d1d", fontSize: "0.9rem" }}>
              {error.message || "Unbekannter Fehler"}
            </p>
            {error.digest && (
              <p style={{ color: "#b91c1c", fontSize: "0.75rem" }}>
                Digest: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
