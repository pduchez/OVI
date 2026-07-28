import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-ovi-ink">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneColor =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "bad"
      ? "text-red-600"
      : "text-ovi-ink";
  return (
    <div className="card">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${toneColor}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  cta,
}: {
  title: string;
  hint?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-2 text-3xl">🗂️</div>
      <div className="font-semibold text-slate-700">{title}</div>
      {hint ? <div className="mt-1 max-w-sm text-sm text-slate-500">{hint}</div> : null}
      {cta ? (
        <Link href={cta.href} className="btn-primary mt-4">
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  prospecto: "bg-slate-100 text-slate-700",
  reservado: "bg-blue-100 text-blue-700",
  vendido: "bg-emerald-100 text-emerald-700",
  en_mora: "bg-amber-100 text-amber-700",
  escriturado: "bg-violet-100 text-violet-700",
  caido: "bg-red-100 text-red-700",
  abierta: "bg-red-100 text-red-700",
  en_proceso: "bg-amber-100 text-amber-700",
  resuelta: "bg-emerald-100 text-emerald-700",
  activo: "bg-emerald-100 text-emerald-700",
  pausado: "bg-amber-100 text-amber-700",
  cerrado: "bg-slate-200 text-slate-600",
  disponible: "bg-emerald-100 text-emerald-700",
  bloqueado: "bg-slate-200 text-slate-600",
  alta: "bg-red-100 text-red-700",
  media: "bg-amber-100 text-amber-700",
  baja: "bg-slate-100 text-slate-600",
  interna: "bg-blue-100 text-blue-700",
  ucoes: "bg-fuchsia-100 text-fuchsia-700",
  destino: "bg-orange-100 text-orange-700",
  ambas: "bg-slate-100 text-slate-600",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  const cls = BADGE_TONES[value] || "bg-slate-100 text-slate-700";
  return <span className={`chip ${cls}`}>{label || value}</span>;
}

/** Barra de embudo simple (sin librerías, sirve en navegadores viejos). */
export function FunnelBars({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-slate-600">{d.label}</span>
            <span className="font-bold text-ovi-ink">{d.value}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-ovi-primary"
              style={{ width: `${Math.round((d.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
