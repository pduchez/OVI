import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getScope, canAccessProject } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import {
  ESTADO_NEGOCIO_LABEL,
  ESTADOS_VENTA_VIVA,
  MOTIVOS_CAIDA,
  labelOf,
  fuerzaCorta,
  TIPOS_ABONO,
  METODOS_PAGO,
} from "@/lib/constants";
import { money, fecha, inputDate } from "@/lib/format";
import { PageHeader, Badge } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { Field, Select, Input, Textarea } from "@/components/fields";
import { registrarCaida, marcarEscriturado } from "../../registrar/actions";

export const dynamic = "force-dynamic";

export default async function NegocioDetalle({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ok?: string };
}) {
  const user = (await getCurrentUser())!;
  const scope = await getScope(user);
  const n = await prisma.negocio.findUnique({
    where: { id: params.id },
    include: {
      project: true,
      vendedor: true,
      registradoPor: { select: { displayName: true, username: true } },
      abonos: {
        orderBy: { fecha: "desc" },
        include: { registradoPor: { select: { displayName: true, username: true } } },
      },
    },
  });
  if (!n) notFound();
  if (!canAccessProject(scope, n.projectId)) redirect("/negocios");

  const cobrado = n.abonos.reduce((s, a) => s + a.monto, 0);
  const saldo = (n.precioLote || 0) - cobrado;
  const viva = ESTADOS_VENTA_VIVA.includes(n.estado);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={n.clienteNombre}
        subtitle={`${n.project?.codigo} · ${n.project?.nombre}${n.loteRef ? ` · ${n.loteRef}` : ""}`}
        action={
          <Link href="/negocios" className="btn-ghost no-print">
            ← Negocios
          </Link>
        }
      />

      {searchParams.ok ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-700">
          ✓ Guardado correctamente.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <Badge value={n.estado} label={ESTADO_NEGOCIO_LABEL[n.estado]} />
            <Badge value={n.fuerza} label={fuerzaCorta(n.fuerza)} />
          </div>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-slate-500">Teléfono</dt>
            <dd className="font-medium">{n.clienteTelefono || "—"}</dd>
            <dt className="text-slate-500">Vendedor</dt>
            <dd className="font-medium">{n.vendedor?.nombre || "—"}</dd>
            <dt className="text-slate-500">Precio del lote</dt>
            <dd className="font-medium">
              {money(n.precioLote)}
              {n.loteId ? (
                <span className="ml-1 text-xs text-slate-400">🔒 inventario</span>
              ) : null}
            </dd>
            <dt className="text-slate-500">Prima pactada</dt>
            <dd className="font-medium">{money(n.prima)}</dd>
            <dt className="text-slate-500">Reserva</dt>
            <dd className="font-medium">{fecha(n.fechaReserva)}</dd>
            <dt className="text-slate-500">Venta</dt>
            <dd className="font-medium">{fecha(n.fechaVenta)}</dd>
            <dt className="text-slate-500">Registrado por</dt>
            <dd className="font-medium">
              {n.registradoPor?.displayName || n.registradoPor?.username || "—"}
            </dd>
            {n.estado === "caido" ? (
              <>
                <dt className="text-slate-500">Motivo de caída</dt>
                <dd className="font-medium text-red-600">
                  {labelOf(MOTIVOS_CAIDA, n.motivoCaida)}
                </dd>
              </>
            ) : null}
          </dl>
          {n.notas ? (
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              {n.notas}
            </p>
          ) : null}
        </div>

        <div className="card">
          <div className="text-xs font-semibold uppercase text-slate-500">Cobrado</div>
          <div className="text-2xl font-bold text-emerald-600">{money(cobrado)}</div>
          <div className="mt-2 text-xs font-semibold uppercase text-slate-500">Saldo</div>
          <div className="text-2xl font-bold text-ovi-ink">{money(saldo)}</div>
          {viva ? (
            <Link
              href={`/registrar/abono?negocio=${n.id}`}
              className="btn-primary mt-4 w-full no-print"
            >
              💵 Registrar abono
            </Link>
          ) : null}
        </div>
      </div>

      {/* Historial de abonos */}
      <div className="mt-4 card">
        <h2 className="mb-3 font-bold text-ovi-ink">Abonos ({n.abonos.length})</h2>
        {n.abonos.length === 0 ? (
          <p className="py-3 text-sm text-slate-500">Aún no hay abonos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Método</th>
                  <th>Boleta</th>
                  <th>Registró</th>
                  <th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {n.abonos.map((a) => (
                  <tr key={a.id}>
                    <td>{fecha(a.fecha)}</td>
                    <td>{labelOf(TIPOS_ABONO, a.tipo)}</td>
                    <td>
                      {labelOf(METODOS_PAGO, a.metodo)}
                      {a.referencia ? (
                        <span className="block text-xs text-slate-400">{a.referencia}</span>
                      ) : null}
                    </td>
                    <td>
                      {a.boletaFileId ? (
                        <a
                          href={`/api/file/${a.boletaFileId}`}
                          target="_blank"
                          className="font-semibold text-ovi-primary"
                        >
                          📎 ver
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="text-xs text-slate-500">
                      {a.registradoPor?.displayName || a.registradoPor?.username || "—"}
                    </td>
                    <td className="text-right font-semibold">{money(a.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Acciones de ciclo de vida */}
      {viva ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 no-print">
          <div className="card">
            <h3 className="mb-3 font-bold text-ovi-ink">Registrar caída</h3>
            <ActionForm action={registrarCaida} submitLabel="Marcar como caído">
              <input type="hidden" name="negocioId" value={n.id} />
              <Field label="Fecha">
                <Input type="date" name="fecha" defaultValue={inputDate(new Date())} />
              </Field>
              <Field label="Motivo">
                <Select name="motivoCaida" options={MOTIVOS_CAIDA} defaultValue="desistio" />
              </Field>
              <Field label="Detalle (opcional)">
                <Textarea name="detalle" rows={2} />
              </Field>
            </ActionForm>
          </div>
          {n.estado !== "escriturado" ? (
            <div className="card">
              <h3 className="mb-3 font-bold text-ovi-ink">Escrituración</h3>
              <p className="mb-3 text-sm text-slate-500">
                Marca el negocio como escriturado cuando se complete el traspaso legal.
              </p>
              <ActionForm action={marcarEscriturado} submitLabel="Marcar escriturado">
                <input type="hidden" name="negocioId" value={n.id} />
              </ActionForm>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
