import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import {
  dashboardKpis,
  funnel,
  ventasPorProyecto,
  ventasPorVendedor,
  ventasPorFuerza,
  caidasPorMotivo,
  cobranza,
} from "@/lib/analytics";
import { rangoPreset, money, money0, num, pct, fecha } from "@/lib/format";
import {
  MOTIVOS_CAIDA,
  ESTADO_NEGOCIO_LABEL,
  labelOf,
  fuerzaCorta,
} from "@/lib/constants";
import { PageHeader, StatCard, FunnelBars, Badge } from "@/components/ui";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const REPORTES = [
  { value: "resumen", label: "Resumen ejecutivo" },
  { value: "por_proyecto", label: "Ventas por proyecto" },
  { value: "por_vendedor", label: "Ventas por vendedor" },
  { value: "por_fuerza", label: "Comparativo por fuerza" },
  { value: "caidas", label: "Análisis de caídas" },
  { value: "cobranza", label: "Cartera y cobranza" },
];

const PRESETS = [
  { value: "semana", label: "7 días" },
  { value: "mes", label: "30 días" },
  { value: "trimestre", label: "90 días" },
  { value: "anio", label: "12 meses" },
];

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: { tipo?: string; r?: string };
}) {
  const user = (await getCurrentUser())!;
  const scope = await getScope(user);
  const tipo = searchParams.tipo || "resumen";
  const preset = searchParams.r || "mes";
  const { desde, hasta } = rangoPreset(preset);

  const csvHref = `/api/reportes/csv?tipo=${tipo}&r=${preset}`;
  const body = await renderReporte(tipo, scope, desde, hasta);

  return (
    <div>
      <PageHeader
        title="Reportes"
        subtitle="Batería de reportes de la operación"
        action={
          <div className="flex gap-2">
            {tipo !== "resumen" && tipo !== "por_fuerza" ? (
              <a href={csvHref} className="btn-ghost no-print">
                ⬇️ CSV
              </a>
            ) : null}
            <PrintButton />
          </div>
        }
      />

      {/* Selectores */}
      <div className="mb-4 grid gap-2 no-print">
        <div className="flex flex-wrap gap-1.5">
          {REPORTES.map((rp) => (
            <Link
              key={rp.value}
              href={`/reportes?tipo=${rp.value}&r=${preset}`}
              className={`chip ${tipo === rp.value ? "bg-ovi-primary text-white" : "bg-white ring-1 ring-slate-300 text-slate-600"}`}
            >
              {rp.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Link
              key={p.value}
              href={`/reportes?tipo=${tipo}&r=${p.value}`}
              className={`chip ${preset === p.value ? "bg-ovi-accent text-white" : "bg-white ring-1 ring-slate-300 text-slate-600"}`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-3 text-sm text-slate-500">
        Período: {fecha(desde)} — {fecha(hasta)}
      </div>

      {body}
    </div>
  );
}

async function renderReporte(
  tipo: string,
  scope: any,
  desde: Date,
  hasta: Date
) {
  if (tipo === "resumen") {
    const [k, f] = await Promise.all([
      dashboardKpis(scope, desde, hasta),
      funnel(scope, desde, hasta),
    ]);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Visitas" value={num(k.visitas)} />
          <StatCard label="Reservas" value={num(k.reservas)} />
          <StatCard label="Ventas" value={num(k.ventas)} hint={money0(k.montoVendido)} tone="good" />
          <StatCard label="Caídas" value={num(k.caidas)} tone={k.caidas ? "bad" : "default"} />
          <StatCard label="Cobrado" value={money0(k.cobrado)} tone="good" />
          <StatCard label="Conversión" value={`${k.conversion}%`} />
          <StatCard label="Novedades abiertas" value={num(k.novedadesAbiertas)} tone={k.novedadesAbiertas ? "warn" : "default"} />
        </div>
        <div className="card">
          <h2 className="mb-4 font-bold text-ovi-ink">Embudo de conversión</h2>
          <FunnelBars
            data={[
              { label: "Visitas", value: f.visitas },
              { label: "Reservas", value: f.reservas },
              { label: "Ventas", value: f.ventas },
              { label: "Escrituras", value: f.escrituras },
            ]}
          />
        </div>
      </div>
    );
  }

  if (tipo === "por_proyecto") {
    const rows = await ventasPorProyecto(scope, desde, hasta);
    const total = rows.reduce((s, r) => s + r.monto, 0);
    return (
      <Tabla
        cols={["Proyecto", "Ventas", "Monto", "% del total"]}
        rows={rows.map((r) => [
          `${r.codigo} · ${r.nombre}`,
          num(r.ventas),
          money(r.monto),
          pct(r.monto, total),
        ])}
        totalRow={["Total", num(rows.reduce((s, r) => s + r.ventas, 0)), money(total), "100%"]}
        empty="Sin ventas en el período."
      />
    );
  }

  if (tipo === "por_vendedor") {
    const rows = await ventasPorVendedor(scope, desde, hasta);
    const total = rows.reduce((s, r) => s + r.monto, 0);
    return (
      <Tabla
        cols={["Vendedor", "Fuerza", "Ventas", "Monto"]}
        rows={rows.map((r) => [
          r.nombre,
          fuerzaCorta(r.fuerza),
          num(r.ventas),
          money(r.monto),
        ])}
        totalRow={["Total", "", num(rows.reduce((s, r) => s + r.ventas, 0)), money(total)]}
        empty="Sin ventas en el período."
      />
    );
  }

  if (tipo === "por_fuerza") {
    const f = await ventasPorFuerza(scope, desde, hasta);
    const totMonto = f.interna.monto + f.ucoes.monto + f.destino.monto;
    const cardsAll = [
      { key: "interna", titulo: "Interna (Oficina — Lic. Claudia)", tx: "text-blue-700" },
      { key: "ucoes", titulo: "UCOES (Externa — Lic. Max)", tx: "text-fuchsia-700" },
      { key: "destino", titulo: "Destinopropiedades.com", tx: "text-orange-700" },
    ];
    const cards = scope.isDP
      ? cardsAll.filter((c) => c.key === "destino")
      : scope.isDirector
      ? cardsAll
      : cardsAll.filter((c) => c.key !== "destino");
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => {
          const d = (f as Record<string, { ventas: number; monto: number }>)[c.key];
          return (
            <div key={c.key} className="card">
              <div className={`text-sm font-semibold ${c.tx}`}>{c.titulo}</div>
              <div className="mt-1 text-3xl font-bold">{d.ventas}</div>
              <div className="text-slate-500">{money(d.monto)}</div>
              <div className="mt-2 text-sm text-slate-400">{pct(d.monto, totMonto)} del monto</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (tipo === "caidas") {
    const rows = await caidasPorMotivo(scope, desde, hasta);
    const total = rows.reduce((s, r) => s + r.cantidad, 0);
    return (
      <Tabla
        cols={["Motivo", "Cantidad", "Monto perdido", "% del total"]}
        rows={rows.map((r) => [
          labelOf(MOTIVOS_CAIDA, r.motivo),
          num(r.cantidad),
          money(r.monto),
          pct(r.cantidad, total),
        ])}
        totalRow={["Total", num(total), money(rows.reduce((s, r) => s + r.monto, 0)), "100%"]}
        empty="Sin caídas en el período. ¡Bien!"
      />
    );
  }

  if (tipo === "cobranza") {
    const { rows, carteraTotal, cobradoTotal, saldoTotal } = await cobranza(scope);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Cartera total" value={money0(carteraTotal)} />
          <StatCard label="Cobrado" value={money0(cobradoTotal)} tone="good" />
          <StatCard label="Saldo por cobrar" value={money0(saldoTotal)} tone="warn" />
        </div>
        <Tabla
          cols={["Cliente", "Proyecto", "Vendedor", "Estado", "Precio", "Cobrado", "Saldo"]}
          rows={rows.map((r) => [
            r.cliente,
            r.proyecto,
            r.vendedor,
            ESTADO_NEGOCIO_LABEL[r.estado] || r.estado,
            money(r.precio),
            money(r.cobrado),
            money(r.saldo),
          ])}
          empty="No hay cartera activa."
        />
      </div>
    );
  }

  return null;
}

function Tabla({
  cols,
  rows,
  totalRow,
  empty,
}: {
  cols: string[];
  rows: (string | number)[][];
  totalRow?: (string | number)[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <div className="card py-8 text-center text-slate-500">{empty}</div>;
  }
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={c} className={i === 0 ? "" : "text-right"}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className={j === 0 ? "font-medium" : "text-right"}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {totalRow ? (
            <tr className="font-bold">
              {totalRow.map((cell, j) => (
                <td key={j} className={j === 0 ? "" : "text-right"}>
                  {cell}
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
