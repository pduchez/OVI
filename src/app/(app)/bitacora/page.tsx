import { prisma } from "@/lib/db";
import { requireCapacidad } from "@/lib/guards";
import { ROLE_LABEL } from "@/lib/constants";
import { fechaHora } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const ACCION_LABEL: Record<string, string> = {
  inventario_import: "Importó inventario",
  inventario_export: "Exportó inventario",
  lote_precio: "Cambió precio de lote",
  lote_alta: "Creó lote",
  doc_upload: "Subió documento",
};

export default async function BitacoraPage() {
  // La bitácora la leen Dirección, gerentes y asistentes: es la herramienta
  // con la que vigilan cambios de precio, cargas de inventario y reservas
  // registradas sin boleta. Los vendedores no entran.
  await requireCapacidad("canManageUsers");
  const [logs, projects] = await Promise.all([
    prisma.securityLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.project.findMany({ select: { id: true, codigo: true } }),
  ]);
  const proj = new Map(projects.map((p) => [p.id, p.codigo]));

  return (
    <div>
      <PageHeader
        title="Bitácora de seguridad"
        subtitle="Acciones sensibles: cargas/descargas de inventario y cambios de precio"
      />
      {logs.length === 0 ? (
        <EmptyState
          title="Sin registros todavía"
          hint="Aquí quedará constancia de cada carga/descarga de inventario y cambio de precio, con el usuario responsable."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Acción</th>
                <th>Proyecto</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap text-slate-500">{fechaHora(l.createdAt)}</td>
                  <td className="font-medium">{l.userName}</td>
                  <td className="text-slate-500">{ROLE_LABEL[l.userRole] || l.userRole}</td>
                  <td>{ACCION_LABEL[l.accion] || l.accion}</td>
                  <td className="text-slate-500">{proj.get(l.projectId) || "—"}</td>
                  <td className="text-slate-600">{l.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
