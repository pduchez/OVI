import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getScope, visibleProjects } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { ESTADOS_VENTA_VIVA, FUERZA_LABEL } from "@/lib/constants";
import { money0, num } from "@/lib/format";
import { PageHeader, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const user = (await getCurrentUser())!;
  const scope = await getScope(user);
  const projects = await visibleProjects(scope);

  // Métricas por proyecto (ventas vivas y monto).
  const ids = projects.map((p) => p.id);
  const ventas = ids.length
    ? await prisma.negocio.groupBy({
        by: ["projectId"],
        where: { projectId: { in: ids }, estado: { in: ESTADOS_VENTA_VIVA } },
        _count: { _all: true },
        _sum: { precioLote: true },
      })
    : [];
  const ventaMap = new Map(ventas.map((v) => [v.projectId, v]));

  return (
    <div>
      <PageHeader title="Proyectos" subtitle={`${projects.length} proyecto(s)`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const v = ventaMap.get(p.id);
          const vendidos = v?._count._all || 0;
          return (
            <Link
              key={p.id}
              href={`/proyectos/${p.id}`}
              className="card transition-transform hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400">{p.codigo}</div>
                  <div className="text-lg font-bold text-ovi-ink">{p.nombre}</div>
                  <div className="text-sm text-slate-500">
                    {p.municipio}, {p.departamento}
                  </div>
                </div>
                <Badge value={p.estado} />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {num(vendidos)}/{num(p.totalLotes)} lotes
                </span>
                <span className="font-semibold text-emerald-600">
                  {money0(v?._sum.precioLote || 0)}
                </span>
              </div>
              <div className="mt-2">
                <Badge value={p.fuerza} label={FUERZA_LABEL[p.fuerza]} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
