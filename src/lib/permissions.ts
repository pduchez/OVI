/**
 * Alcance de datos por rol (quién ve qué).
 *
 *  director      → todos los proyectos y ambas fuerzas.
 *  gerente       → todos los proyectos, pero filtrado a SU fuerza de venta.
 *  lider_central → solo los proyectos asignados (varios).
 *  lider_sitio   → solo su proyecto asignado (uno).
 */
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export interface Scope {
  // null = sin restricción (todos los proyectos). Array = ids permitidos.
  projectIds: string[] | null;
  // null = ambas fuerzas. "interna" | "ucoes" = filtra a esa fuerza.
  fuerza: string | null;
  canRegister: boolean; // puede capturar movimientos
  canAdmin: boolean; // director: administrar usuarios/proyectos/vendedores
  // Gerentes de ventas (Oficina/UCOES) + directores: gestionan inventario y
  // precios de lote (el vendedor/líder NO puede alterar precios).
  canManageInventory: boolean;
  isDirector: boolean;
  isGerente: boolean;
  isLider: boolean;
}

export async function getScope(user: SessionUser): Promise<Scope> {
  if (user.role === "director") {
    return {
      projectIds: null,
      fuerza: null,
      canRegister: true,
      canAdmin: true,
      canManageInventory: true,
      isDirector: true,
      isGerente: false,
      isLider: false,
    };
  }

  if (user.role === "gerente") {
    const fuerza = user.fuerza === "ambas" ? null : user.fuerza;
    return {
      projectIds: null,
      fuerza,
      canRegister: true,
      canAdmin: false,
      canManageInventory: true,
      isDirector: false,
      isGerente: true,
      isLider: false,
    };
  }

  // Líderes: proyectos asignados.
  const assignments = await prisma.projectAssignment.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  const projectIds = assignments.map((a) => a.projectId);
  return {
    projectIds,
    fuerza: null,
    canRegister: true,
    canAdmin: false,
    canManageInventory: false,
    isDirector: false,
    isGerente: false,
    isLider: true,
  };
}

/** Cláusula `where` de Prisma para proyectos, según el alcance. */
export function projectWhere(scope: Scope): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (scope.projectIds) where.id = { in: scope.projectIds };
  if (scope.fuerza) where.fuerza = { in: [scope.fuerza, "ambas"] };
  return where;
}

/** Cláusula `where` para movimientos que tienen projectId + fuerza. */
export function movimientoWhere(scope: Scope): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (scope.projectIds) where.projectId = { in: scope.projectIds };
  if (scope.fuerza) where.fuerza = scope.fuerza;
  return where;
}

/** Proyectos visibles para el usuario (para poblar dropdowns). */
export async function visibleProjects(scope: Scope) {
  return prisma.project.findMany({
    where: projectWhere(scope),
    orderBy: [{ estado: "asc" }, { nombre: "asc" }],
  });
}

/** ¿El usuario puede tocar este proyecto? */
export function canAccessProject(scope: Scope, projectId: string): boolean {
  if (!scope.projectIds) return true;
  return scope.projectIds.includes(projectId);
}
