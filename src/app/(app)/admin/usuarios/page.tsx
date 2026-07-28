import Link from "next/link";
import { prisma } from "@/lib/db";
import { ROLES, ROLE_LABEL, FUERZAS_CON_AMBAS, FUERZA_LABEL } from "@/lib/constants";
import { PageHeader, Badge } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { Field, Select, Input } from "@/components/fields";
import { guardarUsuario, toggleUsuario } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminUsuarios({
  searchParams,
}: {
  searchParams: { edit?: string; ok?: string };
}) {
  const [usuarios, proyectos] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { username: "asc" }],
      include: { assignments: { select: { projectId: true } } },
    }),
    prisma.project.findMany({ orderBy: { codigo: "asc" } }),
  ]);
  const editing = searchParams.edit
    ? usuarios.find((u) => u.id === searchParams.edit)
    : null;
  const editingProjectIds = new Set(editing?.assignments.map((a) => a.projectId));

  return (
    <div>
      <PageHeader title="Usuarios y accesos" subtitle={`${usuarios.length} usuario(s)`} />
      {searchParams.ok ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-700">
          ✓ Usuario guardado.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Lista */}
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Proyectos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50 ${!u.activo ? "opacity-50" : ""}`}>
                  <td className="font-mono text-xs">{u.username}</td>
                  <td className="font-medium">{u.displayName || "—"}</td>
                  <td><Badge value={u.role} label={ROLE_LABEL[u.role]} /></td>
                  <td className="text-slate-500">
                    {u.role === "director" || u.role === "gerente"
                      ? "Todos"
                      : u.assignments.length}
                  </td>
                  <td className="whitespace-nowrap">
                    <Link href={`/admin/usuarios?edit=${u.id}`} className="text-sm font-semibold text-ovi-primary">
                      Editar
                    </Link>
                    <form action={toggleUsuario} className="inline">
                      <input type="hidden" name="id" value={u.id} />
                      <button className="ml-2 text-sm text-slate-400 hover:text-slate-600">
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                    </form>
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
              {editing ? `Editar ${editing.username}` : "Nuevo usuario"}
            </h2>
            {editing ? (
              <Link href="/admin/usuarios" className="text-sm text-slate-500">+ Nuevo</Link>
            ) : null}
          </div>
          <ActionForm
            key={editing?.id || "nuevo"}
            action={guardarUsuario}
            submitLabel={editing ? "Guardar cambios" : "Crear usuario"}
          >
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <Field label="Usuario (para entrar)">
              <Input name="username" defaultValue={editing?.username} placeholder="ej. sitio2" required />
            </Field>
            <Field label="Nombre visible">
              <Input name="displayName" defaultValue={editing?.displayName} placeholder="Nombre y apellido" />
            </Field>
            <Field label="Nivel de acceso">
              <Select name="role" options={ROLES} defaultValue={editing?.role || "lider_sitio"} />
            </Field>
            <Field label="Fuerza (solo para gerente)" hint="Define qué ve un gerente">
              <Select name="fuerza" options={FUERZAS_CON_AMBAS} defaultValue={editing?.fuerza || "ambas"} />
            </Field>
            <Field label="Teléfono">
              <Input name="phone" inputMode="tel" defaultValue={editing?.phone} />
            </Field>
            <Field label={editing ? "Nueva contraseña (dejar vacío = sin cambio)" : "Contraseña inicial"}>
              <Input name="password" type="text" placeholder={editing ? "" : "password"} />
            </Field>

            <div>
              <span className="label">Proyectos asignados (solo líderes)</span>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {proyectos.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      name="projectIds"
                      value={p.id}
                      defaultChecked={editingProjectIds.has(p.id)}
                      className="h-4 w-4"
                    />
                    <span className="font-mono text-xs text-slate-400">{p.codigo}</span>
                    <span>{p.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
