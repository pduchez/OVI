import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getScope, visibleProjects } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { ROLE_LABEL, FUERZAS, FUERZAS_CON_AMBAS, fuerzaCorta } from "@/lib/constants";
import { PageHeader, Badge } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { Field, Select, Input } from "@/components/fields";
import {
  guardarUsuarioGestion,
  resetPasswordUsuario,
  toggleActivoUsuario,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const me = (await getCurrentUser())!;
  const scope = await getScope(me);
  const esDirector = scope.manageFuerza === null;

  // Usuarios que puede administrar (su fuerza, o todos si director).
  const whereU: Record<string, unknown> = {};
  if (!esDirector) whereU.fuerza = scope.manageFuerza;
  const [usuarios, proyectos] = await Promise.all([
    prisma.user.findMany({
      where: whereU,
      orderBy: [{ role: "asc" }, { displayName: "asc" }],
      include: {
        assignments: { select: { projectId: true } },
        supervisor: { select: { displayName: true, username: true } },
      },
    }),
    visibleProjects(scope),
  ]);
  const editing = sp.edit ? usuarios.find((u) => u.id === sp.edit) : null;
  const editProjectIds = new Set(editing?.assignments.map((a) => a.projectId));

  // Roles permitidos según quién administra.
  const rolesDisponibles = esDirector
    ? [
        { value: "director", label: "Director" },
        { value: "gerente", label: "Gerente de ventas" },
        { value: "asistente", label: "Asistente ejecutiva/administrativa" },
        { value: "vendedor", label: "Vendedor de proyecto" },
      ]
    : [
        { value: "asistente", label: "Asistente ejecutiva/administrativa" },
        { value: "vendedor", label: "Vendedor de proyecto" },
      ];

  // Posibles supervisores (mando de la misma fuerza).
  const supervisores = usuarios.filter((u) =>
    ["director", "gerente", "asistente"].includes(u.role)
  );

  return (
    <div>
      <PageHeader
        title="Administración de usuarios"
        subtitle={
          esDirector
            ? `${usuarios.length} usuario(s) · todas las fuerzas`
            : `${usuarios.length} usuario(s) · fuerza ${fuerzaCorta(scope.manageFuerza || "")}`
        }
      />
      {sp.ok ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-700">
          ✓ Usuario guardado. Contraseña inicial: <b>password</b> (deberá cambiarla al ingresar).
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Lista */}
        <div className="card overflow-x-auto">
          <table className="table table-cards">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Fuerza</th>
                <th>Superior</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50 ${!u.activo ? "opacity-50" : ""}`}>
                  <td data-label="Persona" className="font-medium">
                    {u.displayName || "—"}
                    {u.email ? <span className="block text-xs text-slate-400">{u.email}</span> : null}
                  </td>
                  <td data-label="Usuario" className="font-mono text-xs">{u.username}</td>
                  <td data-label="Rol"><Badge value={u.role} label={ROLE_LABEL[u.role] || u.role} /></td>
                  <td data-label="Fuerza" className="text-slate-500">{fuerzaCorta(u.fuerza)}</td>
                  <td data-label="Superior" className="text-xs text-slate-500">
                    {u.supervisor?.displayName || u.supervisor?.username || "—"}
                  </td>
                  <td data-label="" className="whitespace-nowrap">
                    <Link href={`/usuarios?edit=${u.id}`} className="text-sm font-semibold text-ovi-primary">
                      Editar
                    </Link>
                    <form action={resetPasswordUsuario} className="inline">
                      <input type="hidden" name="id" value={u.id} />
                      <button className="ml-2 text-xs text-slate-400 hover:text-slate-600">
                        Reset clave
                      </button>
                    </form>
                    <form action={toggleActivoUsuario} className="inline">
                      <input type="hidden" name="id" value={u.id} />
                      <button className="ml-2 text-xs text-slate-400 hover:text-slate-600">
                        {u.activo ? "Baja" : "Alta"}
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
              <Link href="/usuarios" className="text-sm text-slate-500">+ Nuevo</Link>
            ) : null}
          </div>
          <ActionForm
            key={editing?.id || "nuevo"}
            action={guardarUsuarioGestion}
            submitLabel={editing ? "Guardar cambios" : "Crear usuario"}
          >
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <Field label="Nombre de la persona (real)">
              <Input name="displayName" defaultValue={editing?.displayName} placeholder="Nombre y apellido" required />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Correo">
                <Input name="email" type="email" defaultValue={editing?.email} placeholder="correo@ejemplo.com" />
              </Field>
              <Field label="Celular">
                <Input name="phone" inputMode="tel" defaultValue={editing?.phone} placeholder="7000-0000" />
              </Field>
            </div>
            <Field label="Usuario (para ingresar)">
              <Input name="username" defaultValue={editing?.username} placeholder="ej. jperez" required />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Rol">
                <Select name="role" options={rolesDisponibles} defaultValue={editing?.role || "vendedor"} />
              </Field>
              {esDirector ? (
                <Field label="Fuerza">
                  <Select name="fuerza" options={FUERZAS_CON_AMBAS} defaultValue={editing?.fuerza || "interna"} />
                </Field>
              ) : (
                <Field label="Fuerza">
                  <input type="hidden" name="fuerza" value={scope.manageFuerza || "interna"} />
                  <div className="field bg-slate-50 text-slate-500">
                    {fuerzaCorta(scope.manageFuerza || "")}
                  </div>
                </Field>
              )}
            </div>
            <Field label="Superior directo" hint="Trazabilidad de la jerarquía">
              <Select
                name="supervisorId"
                options={[
                  { value: "", label: "— Sin superior —" },
                  ...supervisores.map((s) => ({
                    value: s.id,
                    label: `${s.displayName || s.username} (${ROLE_LABEL[s.role] || s.role})`,
                  })),
                ]}
                defaultValue={editing?.supervisorId || ""}
              />
            </Field>
            <Field label={editing ? "Nueva contraseña (vacío = sin cambio)" : "Contraseña inicial"}>
              <Input name="password" type="text" placeholder={editing ? "" : "password"} />
            </Field>

            <div>
              <span className="label">Proyectos asignados (solo vendedores)</span>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {proyectos.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      name="projectIds"
                      value={p.id}
                      defaultChecked={editProjectIds.has(p.id)}
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
