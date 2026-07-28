import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getScope, visibleProjects } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { num, money0 } from "@/lib/format";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InventarioIndex() {
  const user = (await getCurrentUser())!;
  const scope = await getScope(user);
  const projects = await visibleProjects(scope);
  const ids = projects.map((p) => p.id);

  const porEstado = ids.length
    ? await prisma.lote.groupBy({
        by: ["projectId", "estado"],
        where: { projectId: { in: ids } },
        _count: { _all: true },
      })
    : [];
  const map = new Map<string, { total: number; disponible: number }>();
  for (const g of porEstado) {
    const row = map.get(g.projectId) || { total: 0, disponible: 0 };
    row.total += g._count._all;
    if (g.estado === "disponible") row.disponible += g._count._all;
    map.set(g.projectId, row);
  }

  return (
    <div>
      <PageHeader
        title="Inventario"
        subtitle="Carga y administra los lotes de cada proyecto (gerentes y dirección)"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const s = map.get(p.id) || { total: 0, disponible: 0 };
          return (
            <Link
              key={p.id}
              href={`/inventario/${p.id}`}
              className="card transition-transform hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-xs font-semibold text-slate-400">{p.codigo}</div>
              <div className="text-lg font-bold text-ovi-ink">{p.nombre}</div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {num(s.total)} lotes cargados
                </span>
                <span className="font-semibold text-emerald-600">
                  {num(s.disponible)} disp.
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-400">Desde {money0(p.precioDesde)}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
