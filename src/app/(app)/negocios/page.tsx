import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getScope, movimientoWhere } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { ESTADOS_NEGOCIO, ESTADO_NEGOCIO_LABEL } from "@/lib/constants";
import { money, fecha } from "@/lib/format";
import { PageHeader, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NegociosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const scope = await getScope(user);
  const estado = sp.estado || "";

  const where: Record<string, unknown> = { ...movimientoWhere(scope) };
  if (estado) where.estado = estado;

  const negocios = await prisma.negocio.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      project: { select: { nombre: true, codigo: true } },
      vendedor: { select: { nombre: true } },
      abonos: { select: { monto: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Negocios"
        subtitle={`${negocios.length} registro(s)`}
        action={
          <Link href="/registrar/negocio" className="btn-primary no-print">
            ➕ Nuevo
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5 no-print">
        <Link
          href="/negocios"
          className={`chip ${!estado ? "bg-ovi-primary text-white" : "bg-white ring-1 ring-slate-300 text-slate-600"}`}
        >
          Todos
        </Link>
        {ESTADOS_NEGOCIO.map((e) => (
          <Link
            key={e.value}
            href={`/negocios?estado=${e.value}`}
            className={`chip ${estado === e.value ? "bg-ovi-primary text-white" : "bg-white ring-1 ring-slate-300 text-slate-600"}`}
          >
            {e.label}
          </Link>
        ))}
      </div>

      {negocios.length === 0 ? (
        <EmptyState
          title="Sin negocios"
          hint="Registra una reserva o venta para empezar."
          cta={{ href: "/registrar/negocio", label: "Registrar negocio" }}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table table-cards">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Proyecto</th>
                <th>Lote</th>
                <th>Estado</th>
                <th className="text-right">Precio</th>
                <th className="text-right">Saldo</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {negocios.map((n) => {
                const cobrado = n.abonos.reduce((s, a) => s + a.monto, 0);
                const saldo = (n.precioLote || 0) - cobrado;
                return (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td data-label="Cliente">
                      <Link
                        href={`/negocios/${n.id}`}
                        className="font-semibold text-ovi-primary hover:underline"
                      >
                        {n.clienteNombre}
                      </Link>
                    </td>
                    <td data-label="Proyecto" className="text-slate-600">{n.project?.codigo}</td>
                    <td data-label="Lote" className="text-slate-600">{n.loteRef || "—"}</td>
                    <td data-label="Estado">
                      <Badge value={n.estado} label={ESTADO_NEGOCIO_LABEL[n.estado]} />
                    </td>
                    <td data-label="Precio" className="text-right">{money(n.precioLote)}</td>
                    <td data-label="Saldo" className="text-right font-medium">{money(saldo)}</td>
                    <td data-label="Fecha" className="text-slate-500">{fecha(n.fechaVenta || n.fechaReserva)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
