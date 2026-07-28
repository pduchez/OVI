import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getScope, canAccessInventario } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/lotes?projectId=...&all=1
 * Devuelve los lotes de un proyecto (por defecto solo los DISPONIBLES) para
 * poblar el dropdown de reserva/venta. Usa el alcance de INVENTARIO: UCOES
 * y DP venden en cualquier proyecto, así que ven todos los lotes.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const scope = await getScope(user);

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") || "";
  const all = url.searchParams.get("all") === "1";
  if (!projectId || !canAccessInventario(scope, projectId)) {
    return Response.json({ lotes: [], total: 0 });
  }

  const where: Record<string, unknown> = { projectId };
  if (!all) where.estado = "disponible";

  const lotes = await prisma.lote.findMany({
    where,
    orderBy: { numero: "asc" },
    select: { id: true, numero: true, precio: true, area: true, estado: true },
  });
  const total = await prisma.lote.count({ where: { projectId } });
  return Response.json({ lotes, total });
}
