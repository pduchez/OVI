import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getScope, canAccessProject } from "@/lib/permissions";
import { buildInventoryXlsx } from "@/lib/inventory";
import { logSecurity } from "@/lib/securityLog";

export const dynamic = "force-dynamic";

/** GET /api/inventario/export?projectId=... → Excel del inventario. Gerentes/dir. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  const scope = await getScope(user);
  if (!scope.canManageInventory) return new Response("Prohibido", { status: 403 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") || "";
  if (!projectId || !canAccessProject(scope, projectId)) {
    return new Response("Proyecto inválido", { status: 400 });
  }

  const [project, lotes] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.lote.findMany({ where: { projectId }, orderBy: { numero: "asc" } }),
  ]);

  const buf = buildInventoryXlsx(
    lotes.map((l) => ({
      numero: l.numero,
      area: l.area,
      precio: l.precio,
      estado: l.estado,
      notas: l.notas,
    }))
  );

  await logSecurity(
    user,
    "inventario_export",
    `Exportó inventario (${lotes.length} lotes)`,
    projectId
  );

  const nombre = `inventario_${project?.codigo || projectId}.xlsx`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
