import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getScope, canAccessProject } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { ESTADOS_LOTE } from "@/lib/constants";
import { money, num, fechaHora } from "@/lib/format";
import { PageHeader, Badge, StatCard } from "@/components/ui";
import LogoProyecto from "@/components/LogoProyecto";
import ActionForm from "@/components/ActionForm";
import { Field, Select, Input, Textarea } from "@/components/fields";
import { guardarLote, importarInventario, subirDocumento } from "../actions";

export const dynamic = "force-dynamic";

export default async function InventarioProyecto({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ edit?: string; ok?: string; c?: string; a?: string; h?: string; ig?: string }>;
}) {
  const sp = await searchParams;
  const par = await params;
  const user = await requireUser();
  const scope = await getScope(user);
  if (!canAccessProject(scope, par.projectId)) redirect("/inventario");

  const project = await prisma.project.findUnique({ where: { id: par.projectId } });
  if (!project) notFound();

  const [lotes, porEstado, imports] = await Promise.all([
    prisma.lote.findMany({ where: { projectId: project.id }, orderBy: { numero: "asc" }, take: 1000 }),
    prisma.lote.groupBy({
      by: ["estado"],
      where: { projectId: project.id },
      _count: { _all: true },
    }),
    prisma.inventoryImport.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const cnt = (e: string) => porEstado.find((g) => g.estado === e)?._count._all || 0;
  const editing = sp.edit ? lotes.find((l) => l.id === sp.edit) : null;
  const canManage = scope.canManageInventory; // DP entra en solo-lectura

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <LogoProyecto codigo={project.codigo} nombre={project.nombre} size={72} />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-400">{project.codigo}</div>
          <div className="truncate text-xl font-bold text-ovi-ink">{project.nombre}</div>
          <div className="text-sm text-slate-500">{project.municipio}, {project.departamento}</div>
        </div>
      </div>
      <PageHeader
        title="Inventario"
        subtitle={`${num(lotes.length)} lote(s) cargado(s)`}
        action={
          <div className="flex gap-2 no-print">
            {canManage ? (
              <a href={`/api/inventario/export?projectId=${project.id}`} className="btn-ghost">
                ⬇️ Exportar Excel
              </a>
            ) : null}
            <Link href="/inventario" className="btn-ghost">← Proyectos</Link>
          </div>
        }
      />

      {!canManage ? (
        <p className="mb-4 rounded-lg bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          Vista de inventario (solo lectura). Los precios los fija Grupo Chacón.
        </p>
      ) : null}

      {sp.ok === "import" ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-700">
          ✓ Importación completada: {sp.c} creados, {sp.a} actualizados.
          {sp.h ? (
            <span className="mt-1 block text-sm font-normal">
              Se leyó la hoja <b>{sp.h}</b>
              {sp.ig && sp.ig !== "0" ? ` · se ignoraron ${sp.ig} hoja(s) sin lotes` : ""}.
            </span>
          ) : null}
        </p>
      ) : sp.ok ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-700">
          ✓ Guardado correctamente.
        </p>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Disponibles" value={num(cnt("disponible"))} tone="good" />
        <StatCard label="Reservados" value={num(cnt("reservado"))} />
        <StatCard label="Vendidos" value={num(cnt("vendido"))} tone="good" />
        <StatCard label="Bloqueados" value={num(cnt("bloqueado"))} />
      </div>

      {/* Importar / cargar (solo gestores) */}
      {canManage ? (
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-bold text-ovi-ink">Importar inventario (Excel / CSV)</h2>
          <p className="mt-1 mb-3 text-sm text-slate-500">
            Columnas: <b>numero</b>, <b>area</b>, <b>precio</b>, estado, notas. Los lotes
            existentes se actualizan por su número. Queda registrado en la bitácora.
          </p>
          <ActionForm action={importarInventario} submitLabel="Importar archivo">
            <input type="hidden" name="projectId" value={project.id} />
            <input
              type="file"
              name="archivo"
              accept=".xlsx,.xls,.csv"
              className="field bg-white"
              required
            />
          </ActionForm>
          <a
            href={`/api/inventario/export?projectId=${project.id}`}
            className="mt-2 inline-block text-sm font-semibold text-ovi-primary"
          >
            ⬇️ Descargar plantilla / inventario actual
          </a>
        </div>

        <div className="card">
          <h2 className="font-bold text-ovi-ink">Adjuntar documento (PDF / Excel)</h2>
          <p className="mt-1 mb-3 text-sm text-slate-500">
            Guarda el documento original del inventario como respaldo. Queda en la
            bitácora de seguridad.
          </p>
          <ActionForm action={subirDocumento} submitLabel="Subir documento">
            <input type="hidden" name="projectId" value={project.id} />
            <input
              type="file"
              name="archivo"
              accept=".pdf,.xlsx,.xls,.csv,image/*"
              className="field bg-white"
              required
            />
          </ActionForm>
          {imports.length ? (
            <div className="mt-3 text-xs text-slate-500">
              <div className="font-semibold text-slate-600">Últimas cargas:</div>
              <ul className="mt-1 space-y-1">
                {imports.map((im) => (
                  <li key={im.id} className="flex items-center justify-between gap-2">
                    <span>
                      {im.formato.toUpperCase()} · {im.userName} ·{" "}
                      {im.filas ? `${im.creados}+${im.actualizados}` : "doc"}
                    </span>
                    {im.fileId ? (
                      <a
                        href={`/api/file/${im.fileId}`}
                        target="_blank"
                        className="font-semibold text-ovi-primary"
                      >
                        ver
                      </a>
                    ) : null}
                    <span className="text-slate-400">{fechaHora(im.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      ) : null}

      {/* Lotes + alta/edición */}
      <div className={`grid gap-6 ${canManage ? "lg:grid-cols-[1fr_320px]" : ""}`}>
        <div className="card overflow-x-auto">
          <h2 className="mb-3 font-bold text-ovi-ink">Lotes ({num(lotes.length)})</h2>
          {lotes.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Aún no hay lotes cargados en este proyecto.
            </p>
          ) : (
            <table className="table table-cards">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th className="text-right">Área m²</th>
                  <th className="text-right">Precio</th>
                  <th>Estado</th>
                  {canManage ? <th></th> : null}
                </tr>
              </thead>
              <tbody>
                {lotes.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td data-label="Lote" className="font-medium">{l.numero}</td>
                    <td data-label="Área m²" className="text-right">{num(l.area)}</td>
                    <td data-label="Precio" className="text-right font-semibold">{money(l.precio)}</td>
                    <td data-label="Estado"><Badge value={l.estado} /></td>
                    {canManage ? (
                      <td data-label="">
                        <Link
                          href={`/inventario/${project.id}?edit=${l.id}`}
                          className="text-sm font-semibold text-ovi-primary"
                        >
                          Editar
                        </Link>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {canManage ? (
        <div className="card h-fit">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ovi-ink">
              {editing ? `Editar ${editing.numero}` : "Agregar lote"}
            </h2>
            {editing ? (
              <Link href={`/inventario/${project.id}`} className="text-sm text-slate-500">
                + Nuevo
              </Link>
            ) : null}
          </div>
          <ActionForm
            key={editing?.id || "nuevo"}
            action={guardarLote}
            submitLabel={editing ? "Guardar cambios" : "Agregar lote"}
          >
            <input type="hidden" name="projectId" value={project.id} />
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <Field label="Número de lote">
              <Input name="numero" defaultValue={editing?.numero} placeholder="Ej. Lote 24" required />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Área (m²)">
                <Input name="area" inputMode="decimal" defaultValue={editing?.area || ""} />
              </Field>
              <Field label="Precio (US$)">
                <Input name="precio" inputMode="decimal" defaultValue={editing?.precio || ""} />
              </Field>
            </div>
            <Field label="Estado">
              <Select name="estado" options={ESTADOS_LOTE} defaultValue={editing?.estado || "disponible"} />
            </Field>
            <Field label="Notas">
              <Textarea name="notas" defaultValue={editing?.notas} rows={2} />
            </Field>
          </ActionForm>
        </div>
        ) : null}
      </div>
    </div>
  );
}
