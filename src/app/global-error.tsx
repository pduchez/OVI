"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          background: "#f1f5f9",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h1 style={{ fontSize: 20 }}>Ocurrió un problema</h1>
          <p style={{ color: "#475569" }}>
            Intenta recargar la página. Si persiste, revisa /api/health.
          </p>
          {error?.digest ? (
            <p style={{ color: "#94a3b8", fontSize: 12 }}>Ref: {error.digest}</p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              background: "#1d4ed8",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 600,
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
