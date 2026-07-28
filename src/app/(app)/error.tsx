"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="card text-center">
        <div className="mb-2 text-4xl">⚠️</div>
        <h1 className="text-xl font-bold text-ovi-ink">Ocurrió un problema</h1>
        <p className="mt-2 text-sm text-slate-600">
          No se pudo cargar esta sección. Suele ser un corte momentáneo de la
          base de datos. Intenta de nuevo.
        </p>
        {error?.digest ? (
          <p className="mt-2 text-xs text-slate-400">Ref: {error.digest}</p>
        ) : null}
        <button onClick={reset} className="btn-primary mt-4">
          Reintentar
        </button>
      </div>
    </div>
  );
}
