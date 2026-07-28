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
  // null = todas las fuerzas visibles. "interna"|"ucoes"|"destino" = solo esa.
  fuerza: string | null;
  // Oculta la actividad de la fuerza Destinopropiedades.com (para Chacón).
  excludeDestino: boolean;
  canRegister: boolean; // puede capturar movimientos
  canAdmin: boolean; // director: administrar usuarios/proyectos/vendedores
  // Gerentes de ventas (Oficina/UCOES) + directores: gestionan inventario y
  // precios de lote (el vendedor/líder NO puede alterar precios).
  canManageInventory: boolean;
  // Puede VER el inventario (managers, dirección y la fuerza DP en solo-lectura).
  canViewInventory: boolean;
  // Fuerza fija con la que registra (DP siempre registra como "destino").
  fuerzaFija: string | null;
  isDirector: boolean;
  isGerente: boolean;
  isLider: boolean;
  isDP: boolean; // pertenece a la fuerza Destinopropiedades.com
}

export async function getScope(user: SessionUser): Promise<Scope> {
  if (user.role === "director") {
    return {
      projectIds: null,
      fuerza: null,
      excludeDestino: false,
      canRegister: true,
      canAdmin: true,
      canManageInventory: true,
      canViewInventory: true,
      fuerzaFija: null,
      isDirector: true,
      isGerente: false,
      isLider: false,
      isDP: false,
    };
  }

  // Fuerza Destinopropiedades.com (externa): ve TODOS los proyectos y su
  // inventario (solo-lectura), registra como "destino" y su actividad es
  // invisible para las fuerzas internas de Chacón. No edita precios.
  if (user.fuerza === "destino") {
    return {
      projectIds: null,
      fuerza: "destino",
      excludeDestino: false,
      canRegister: true,
      canAdmin: false,
      canManageInventory: false,
      canViewInventory: true,
      fuerzaFija: "destino",
      isDirector: false,
      isGerente: user.role === "gerente",
      isLider: user.role !== "gerente",
      isDP: true,
    };
  }

  if (user.role === "gerente") {
    // Gerente interno: ve su fuerza (interna/ucoes) o ambas internas, nunca DP.
    const fuerza = user.fuerza === "ambas" ? null : user.fuerza;
    return {
      projectIds: null,
      fuerza,
      excludeDestino: fuerza === null,
      canRegister: true,
      canAdmin: false,
      canManageInventory: true,
      canViewInventory: true,
      fuerzaFija: fuerza && fuerza !== "ambas" ? fuerza : null,
      isDirector: false,
      isGerente: true,
      isLider: false,
      isDP: false,
    };
  }

  // Líderes internos: proyectos asignados; NO ven la actividad de DP.
  const assignments = await prisma.projectAssignment.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  const projectIds = assignments.map((a) => a.projectId);
  return {
    projectIds,
    fuerza: null,
    excludeDestino: true,
    canRegister: true,
    canAdmin: false,
    canManageInventory: false,
    canViewInventory: false,
    fuerzaFija: null,
    isDirector: false,
    isGerente: false,
    isLider: true,
    isDP: false,
  };
}

/** Cláusula `where` de Prisma para proyectos, según el alcance. */
export function projectWhere(scope: Scope): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (scope.projectIds) where.id = { in: scope.projectIds };
  // La fuerza DP ve TODOS los proyectos (para inventario y registro).
  if (!scope.isDP && scope.fuerza) where.fuerza = { in: [scope.fuerza, "ambas"] };
  return where;
}

/** Cláusula `where` para movimientos que tienen projectId + fuerza. */
export function movimientoWhere(scope: Scope): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (scope.projectIds) where.projectId = { in: scope.projectIds };
  if (scope.fuerza) where.fuerza = scope.fuerza;
  else if (scope.excludeDestino) where.fuerza = { not: "destino" };
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
