import Link from "next/link";
import { requireCapacidad } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { num, money0 } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import LogoProyecto from "@/components/LogoProyecto";

export const dynamic = "force-dynamic";

export default async function InventarioIndex() {
  const { scope } = await requireCapacidad("canViewInventory");
  // El inventario tiene su propio alcance: UCOES y DP lo ven completo aunque
  // su actividad esté acotada a su fuerza.
  const projects = await prisma.project.findMany({
    where: scope.inventoryProjectIds ? { id: { in: scope.inventoryProjectIds } } : {},
    orderBy: [{ estado: "asc" }, { nombre: "asc" }],
  });
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

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No tienes proyectos asignados"
        hint="Pide a tu gerente o a la asistente que te asigne un proyecto."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Inventario"
        subtitle={
          scope.canManageInventory
            ? "Carga los lotes y fija los precios de cada proyecto"
            : "Estado de los lotes al día. Marca aquí lo que se reserva o se vende."
        }
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
              <div className="flex items-center gap-3">
                <LogoProyecto codigo={p.codigo} nombre={p.nombre} size={56} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-400">{p.codigo}</div>
                  <div className="text-lg font-bold leading-tight text-ovi-ink">{p.nombre}</div>
                </div>
              </div>
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
