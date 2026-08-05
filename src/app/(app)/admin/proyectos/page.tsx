import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { DEPARTAMENTOS_SV, FUERZAS_CON_AMBAS, FUERZA_LABEL } from "@/lib/constants";
import { money0, num } from "@/lib/format";
import { PageHeader, Badge } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { Field, Select, Input, Textarea } from "@/components/fields";
import { guardarProyecto, cargarProyectosOficiales } from "../actions";

export const dynamic = "force-dynamic";

const ESTADOS = [
  { value: "activo", label: "Activo" },
  { value: "pausado", label: "Pausado" },
  { value: "cerrado", label: "Cerrado" },
];

export default async function AdminProyectos({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; ok?: string; c?: string; a?: string; e?: string }>;
}) {
  // Ocultar el enlace del menú no basta: sin esto, cualquier usuario con
  // sesión podía abrir esta página escribiendo la URL.
  await requireAdmin();
  const sp = await searchParams;
  const proyectos = await prisma.project.findMany({ orderBy: { codigo: "asc" } });
  const editing = sp.edit
    ? proyectos.find((p) => p.id === sp.edit)
    : null;

  return (
    <div>
      <PageHeader
        title="Proyectos"
        subtitle={`${proyectos.length} proyecto(s)`}
        action={
          <form action={cargarProyectosOficiales} className="no-print">
            <button className="btn-ghost">🏢 Cargar proyectos oficiales</button>
          </form>
        }
      />
      {sp.ok === "oficiales" ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-700">
          ✓ Catálogo oficial cargado: {sp.c} creados, {sp.a} actualizados
          {sp.e && sp.e !== "0" ? `, ${sp.e} placeholders eliminados` : ""}.
        </p>
      ) : sp.ok ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-700">
          ✓ Proyecto guardado.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Lista */}
        <div className="card overflow-x-auto">
          <table className="table table-cards">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Fuerza</th>
                <th className="text-right">Lotes</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td data-label="Código" className="font-mono text-xs">{p.codigo}</td>
                  <td data-label="Nombre" className="font-medium">{p.nombre}</td>
                  <td data-label="Ubicación" className="text-slate-500">{p.municipio}, {p.departamento}</td>
                  <td data-label="Fuerza"><Badge value={p.fuerza} label={FUERZA_LABEL[p.fuerza]} /></td>
                  <td data-label="Lotes" className="text-right">{num(p.totalLotes)}</td>
                  <td data-label="Estado"><Badge value={p.estado} /></td>
                  <td data-label="">
                    <Link href={`/admin/proyectos?edit=${p.id}`} className="text-sm font-semibold text-ovi-primary">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Formulario */}
        <div className="card h-fit">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ovi-ink">
              {editing ? `Editar ${editing.codigo}` : "Nuevo proyecto"}
            </h2>
            {editing ? (
              <Link href="/admin/proyectos" className="text-sm text-slate-500">
                + Nuevo
              </Link>
            ) : null}
          </div>
          <ActionForm
            key={editing?.id || "nuevo"}
            action={guardarProyecto}
            submitLabel={editing ? "Guardar cambios" : "Crear proyecto"}
          >
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Código">
                <Input name="codigo" defaultValue={editing?.codigo} placeholder="CHA-16" required />
              </Field>
              <Field label="Estado">
                <Select name="estado" options={ESTADOS} defaultValue={editing?.estado || "activo"} />
              </Field>
            </div>
            <Field label="Nombre">
              <Input name="nombre" defaultValue={editing?.nombre} placeholder="Nombre del proyecto" required />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Departamento">
                <Select
                  name="departamento"
                  options={DEPARTAMENTOS_SV.map((d) => ({ value: d, label: d }))}
                  defaultValue={editing?.departamento || "San Salvador"}
                />
              </Field>
              <Field label="Municipio">
                <Input name="municipio" defaultValue={editing?.municipio} />
              </Field>
            </div>
            <Field label="Fuerza responsable">
              <Select name="fuerza" options={FUERZAS_CON_AMBAS} defaultValue={editing?.fuerza || "ambas"} />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Total de lotes">
                <Input name="totalLotes" inputMode="numeric" defaultValue={editing?.totalLotes || ""} />
              </Field>
              <Field label="Precio desde (US$)">
                <Input name="precioDesde" inputMode="decimal" defaultValue={editing?.precioDesde || ""} />
              </Field>
            </div>
            <Field label="Notas">
              <Textarea name="notas" defaultValue={editing?.notas} rows={2} />
            </Field>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
