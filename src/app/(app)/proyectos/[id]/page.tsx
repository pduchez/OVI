import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getScope, canAccessProject } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { ESTADOS_VENTA_VIVA, ESTADO_NEGOCIO_LABEL, FUERZA_LABEL } from "@/lib/constants";
import { money, money0, num, fecha } from "@/lib/format";
import { PageHeader, StatCard, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProyectoDetalle({
  params,
}: {
  params: { id: string };
}) {
  const user = (await getCurrentUser())!;
  const scope = await getScope(user);
  if (!canAccessProject(scope, params.id)) redirect("/proyectos");

  const p = await prisma.project.findUnique({ where: { id: params.id } });
  if (!p) notFound();

  const [visitas, ventaAgg, reservas, caidas, negocios] = await Promise.all([
    prisma.visita.count({ where: { projectId: p.id } }),
    prisma.negocio.aggregate({
      where: { projectId: p.id, estado: { in: ESTADOS_VENTA_VIVA } },
      _count: { _all: true },
      _sum: { precioLote: true },
    }),
    prisma.negocio.count({ where: { projectId: p.id, estado: "reservado" } }),
    prisma.negocio.count({ where: { projectId: p.id, estado: "caido" } }),
    prisma.negocio.findMany({
      where: { projectId: p.id },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: { vendedor: { select: { nombre: true } }, abonos: { select: { monto: true } } },
    }),
  ]);

  const vendidos = ventaAgg._count._all;
  const disponibles = Math.max(0, p.totalLotes - vendidos - reservas);

  return (
    <div>
      <PageHeader
        title={p.nombre}
        subtitle={`${p.codigo} · ${p.municipio}, ${p.departamento}`}
        action={
          <Link href="/proyectos" className="btn-ghost no-print">
            ← Proyectos
          </Link>
        }
      />

      <div className="mb-2 flex gap-2">
        <Badge value={p.estado} />
        <Badge value={p.fuerza} label={FUERZA_LABEL[p.fuerza]} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Lotes totales" value={num(p.totalLotes)} />
        <StatCard label="Vendidos" value={num(vendidos)} tone="good" hint={money0(ventaAgg._sum.precioLote || 0)} />
        <StatCard label="Reservados" value={num(reservas)} />
        <StatCard label="Disponibles (aprox.)" value={num(disponibles)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Visitas" value={num(visitas)} />
        <StatCard label="Caídas" value={num(caidas)} tone={caidas ? "bad" : "default"} />
        <StatCard label="Precio desde" value={money0(p.precioDesde)} />
        <StatCard
          label="Conversión"
          value={visitas ? `${Math.round((vendidos / visitas) * 100)}%` : "—"}
        />
      </div>

      <div className="mt-6 card overflow-x-auto">
        <h2 className="mb-3 font-bold text-ovi-ink">Últimos negocios</h2>
        {negocios.length === 0 ? (
          <p className="py-3 text-sm text-slate-500">Aún no hay negocios en este proyecto.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Lote</th>
                <th>Estado</th>
                <th>Vendedor</th>
                <th className="text-right">Precio</th>
                <th className="text-right">Saldo</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {negocios.map((n) => {
                const cobrado = n.abonos.reduce((s, a) => s + a.monto, 0);
                return (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td>
                      <Link href={`/negocios/${n.id}`} className="font-semibold text-ovi-primary hover:underline">
                        {n.clienteNombre}
                      </Link>
                    </td>
                    <td className="text-slate-600">{n.loteRef || "—"}</td>
                    <td><Badge value={n.estado} label={ESTADO_NEGOCIO_LABEL[n.estado]} /></td>
                    <td className="text-slate-600">{n.vendedor?.nombre || "—"}</td>
                    <td className="text-right">{money(n.precioLote)}</td>
                    <td className="text-right">{money((n.precioLote || 0) - cobrado)}</td>
                    <td className="text-slate-500">{fecha(n.fechaVenta || n.fechaReserva)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
