// Helpers que arman las listas para los dropdowns de los formularios,
// respetando el alcance del usuario.
import { prisma } from "@/lib/db";
import type { Scope } from "@/lib/permissions";
import { visibleProjects, movimientoWhere } from "@/lib/permissions";
import { ESTADOS_VENTA_VIVA, fuerzaCorta } from "@/lib/constants";

export async function projectOptions(scope: Scope) {
  const projects = await visibleProjects(scope);
  return projects.map((p) => ({
    value: p.id,
    label: `${p.codigo} · ${p.nombre}`,
    fuerza: p.fuerza,
  }));
}

export async function vendedorOptions(scope: Scope) {
  const where: Record<string, unknown> = { activo: true };
  if (scope.fuerza) where.fuerza = scope.fuerza;
  const vendedores = await prisma.vendedor.findMany({
    where,
    orderBy: { nombre: "asc" },
  });
  return vendedores.map((v) => ({
    value: v.id,
    label: `${v.nombre} (${fuerzaCorta(v.fuerza)})`,
  }));
}

/** Negocios vivos visibles (para el dropdown de abonos). */
export async function negocioOptions(scope: Scope) {
  const negocios = await prisma.negocio.findMany({
    where: { ...movimientoWhere(scope), estado: { in: ESTADOS_VENTA_VIVA } },
    select: {
      id: true,
      clienteNombre: true,
      loteRef: true,
      project: { select: { codigo: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return negocios.map((n) => ({
    value: n.id,
    label: `${n.clienteNombre} · ${n.project?.codigo || ""}${
      n.loteRef ? ` · ${n.loteRef}` : ""
    }`,
  }));
}
