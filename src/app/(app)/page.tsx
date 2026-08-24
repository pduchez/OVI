import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import {
  dashboardKpis,
  funnel,
  ventasPorFuerza,
  actividadReciente,
  pulsoProyectos,
} from "@/lib/analytics";
import { rangoPreset } from "@/lib/format";
import { money0, money, fechaHora, num } from "@/lib/format";
import { PageHeader, StatCard, FunnelBars } from "@/components/ui";
import PulsoProyectos from "@/components/PulsoProyectos";
import { hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

const PRESETS = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "7 días" },
  { value: "mes", label: "30 días" },
  { value: "trimestre", label: "90 días" },
];

const TIPO_ICON: Record<string, string> = {
  visita: "👀",
  reserva: "📝",
  venta: "✅",
  abono: "💵",
  caida: "❌",
  novedad: "📌",
  escritura: "📜",
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const sp = await searchParams;
  if (!hasDatabase()) {
    return (
      <div className="card">
        <h1 className="text-xl font-bold">Falta conectar la base de datos</h1>
        <p className="mt-2 text-slate-600">
          Configura <code className="rounded bg-slate-100 px-1">DATABASE_URL</code> en las
          variables de entorno (ver README de OVI). El resto se crea solo.
        </p>
      </div>
    );
  }

  const user = await requireUser();
  const scope = await getScope(user);
  const preset = sp.r || "mes";
  const { desde, hasta } = rangoPreset(preset);

  const [kpis, f, fuerza, actividad, pulso] = await Promise.all([
    dashboardKpis(scope, desde, hasta),
    funnel(scope, desde, hasta),
    ventasPorFuerza(scope, desde, hasta),
    actividadReciente(scope, 12),
    pulsoProyectos(scope),
  ]);

  // Tarjetas de fuerza visibles según el rol: DP solo ve la suya; las fuerzas
  // internas de Chacón no ven a Destinopropiedades.com; dirección ve todo.
  const CARDS_FUERZA = [
    { key: "interna", label: "Interna", bg: "bg-blue-50", tx: "text-blue-700" },
    { key: "ucoes", label: "UCOES", bg: "bg-fuchsia-50", tx: "text-fuchsia-700" },
    { key: "destino", label: "Destino.com", bg: "bg-orange-50", tx: "text-orange-700" },
  ];
  // Mando y dirección ven las 3 fuerzas (transparencia); un vendedor solo la suya.
  const fuerzasVisibles = scope.isDP
    ? CARDS_FUERZA.filter((c) => c.key === "destino")
    : scope.fuerza
    ? CARDS_FUERZA.filter((c) => c.key === scope.fuerza)
    : CARDS_FUERZA;

  return (
    <div>
      <PageHeader
        title={`Hola, ${user.displayName.split(" ")[0]}`}
        subtitle="Resumen de la operación de ventas"
        action={
          <div className="flex flex-wrap gap-1.5 no-print">
            {PRESETS.map((p) => (
              <Link
                key={p.value}
                href={`/?r=${p.value}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ${
                  preset === p.value
                    ? "bg-ovi-primary text-white ring-ovi-primary"
                    : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Visitas" value={num(kpis.visitas)} />
        <StatCard label="Reservas" value={num(kpis.reservas)} tone="good" />
        <StatCard
          label="Ventas"
          value={num(kpis.ventas)}
          hint={money0(kpis.montoVendido)}
          tone="good"
        />
        <StatCard
          label="Caídas"
          value={num(kpis.caidas)}
          tone={kpis.caidas ? "bad" : "default"}
        />
        <StatCard label="Cobrado" value={money0(kpis.cobrado)} tone="good" />
        <StatCard
          label="Conversión"
          value={`${kpis.conversion}%`}
          hint="visita → venta"
        />
        <StatCard
          label="Novedades abiertas"
          value={num(kpis.novedadesAbiertas)}
          tone={kpis.novedadesAbiertas ? "warn" : "default"}
        />
        <div className="card flex flex-col justify-center gap-2 no-print">
          <Link href="/registrar" className="btn-primary w-full">
            ➕ Registrar movimiento
          </Link>
          <Link href="/reportes" className="btn-ghost w-full">
            📑 Ver reportes
          </Link>
        </div>
      </div>

      {/* Embudo + fuerzas */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-bold text-ovi-ink">Embudo del período</h2>
          <FunnelBars
            data={[
              { label: "Visitas", value: f.visitas },
              { label: "Reservas", value: f.reservas },
              { label: "Ventas", value: f.ventas },
              { label: "Escrituras", value: f.escrituras },
            ]}
          />
        </div>
        <div className="card">
          <h2 className="mb-4 font-bold text-ovi-ink">Ventas por fuerza</h2>
          <div className={`grid gap-3 ${fuerzasVisibles.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {fuerzasVisibles.map((f) => (
              <div key={f.key} className={`rounded-lg ${f.bg} p-4`}>
                <div className={`text-sm font-semibold ${f.tx}`}>{f.label}</div>
                <div className="mt-1 text-2xl font-bold text-ovi-ink">
                  {(fuerza as Record<string, { ventas: number; monto: number }>)[f.key].ventas}
                </div>
                <div className="text-xs text-slate-500">
                  {money0((fuerza as Record<string, { ventas: number; monto: number }>)[f.key].monto)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actividad reciente + pulso de proyectos, en una sola fila: el pulso
          ocupa el ancho que la lista de actividad dejaba vacío, así que el
          tablero no se alarga. */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <div className="card lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-ovi-ink">Actividad reciente</h2>
          <Link href="/negocios" className="text-sm font-semibold text-ovi-primary">
            Ver negocios →
          </Link>
        </div>
        {actividad.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Aún no hay movimientos registrados en tus proyectos.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {actividad.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <span className="text-xl">{TIPO_ICON[a.tipo] || "•"}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-700">
                    {a.resumen}
                  </div>
                  <div className="text-xs text-slate-400">
                    {a.registradoPor?.displayName || "Sistema"} ·{" "}
                    {fechaHora(a.createdAt)}
                  </div>
                </div>
                {a.monto ? (
                  <span className="text-sm font-semibold text-emerald-600">
                    {money0(a.monto)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
        {/* En celular va ARRIBA: para quien va en el carro, saber qué
            proyecto se quedó callado vale más que releer la actividad. */}
        <div className="order-first lg:order-last">
          <PulsoProyectos filas={pulso} />
        </div>
      </div>
    </div>
  );
}
