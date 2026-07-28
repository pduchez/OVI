import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getScope, movimientoWhere } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import {
  CATEGORIAS_NOVEDAD,
  ESTADOS_NOVEDAD,
  labelOf,
} from "@/lib/constants";
import { fecha } from "@/lib/format";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { actualizarNovedad } from "../registrar/actions";

export const dynamic = "force-dynamic";

export default async function NovedadesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const scope = await getScope(user);
  const estado = sp.estado || "";

  const where: Record<string, unknown> = {};
  if (scope.projectIds) where.projectId = { in: scope.projectIds };
  if (estado) where.estado = estado;

  const novedades = await prisma.novedad.findMany({
    where,
    orderBy: [{ estado: "asc" }, { prioridad: "desc" }, { fecha: "desc" }],
    take: 200,
    include: { project: { select: { codigo: true, nombre: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Novedades"
        subtitle="Problemas y notas operativas de los proyectos"
        action={
          <Link href="/registrar/novedad" className="btn-primary no-print">
            ➕ Nueva
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5 no-print">
        <Link
          href="/novedades"
          className={`chip ${!estado ? "bg-ovi-primary text-white" : "bg-white ring-1 ring-slate-300 text-slate-600"}`}
        >
          Todas
        </Link>
        {ESTADOS_NOVEDAD.map((e) => (
          <Link
            key={e.value}
            href={`/novedades?estado=${e.value}`}
            className={`chip ${estado === e.value ? "bg-ovi-primary text-white" : "bg-white ring-1 ring-slate-300 text-slate-600"}`}
          >
            {e.label}
          </Link>
        ))}
      </div>

      {novedades.length === 0 ? (
        <EmptyState
          title="Sin novedades"
          hint="Reporta un problema o nota del proyecto."
          cta={{ href: "/registrar/novedad", label: "Reportar novedad" }}
        />
      ) : (
        <div className="space-y-3">
          {novedades.map((nv) => (
            <div key={nv.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge value={nv.prioridad} />
                    <span className="text-xs font-semibold text-slate-400">
                      {nv.project?.codigo} · {labelOf(CATEGORIAS_NOVEDAD, nv.categoria)}
                    </span>
                  </div>
                  <div className="mt-1 font-bold text-ovi-ink">{nv.titulo}</div>
                  {nv.detalle ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{nv.detalle}</p>
                  ) : null}
                  <div className="mt-1 text-xs text-slate-400">{fecha(nv.fecha)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge value={nv.estado} label={labelOf(ESTADOS_NOVEDAD, nv.estado)} />
                  <form action={actualizarNovedad} className="no-print">
                    <input type="hidden" name="id" value={nv.id} />
                    <select
                      name="estado"
                      defaultValue={nv.estado}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    >
                      {ESTADOS_NOVEDAD.map((e) => (
                        <option key={e.value} value={e.value}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                    <button className="ml-1 rounded-lg bg-slate-100 px-2 py-1 text-sm font-medium hover:bg-slate-200">
                      Cambiar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
