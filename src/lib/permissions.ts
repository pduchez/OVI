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
  canAdmin: boolean; // director: configuración global (proyectos, seguridad)
  // Gerentes de ventas + directores: gestionan inventario y precios de lote.
  canManageInventory: boolean;
  // Puede VER el inventario (managers, dirección y la fuerza DP en solo-lectura).
  canViewInventory: boolean;
  // Puede administrar USUARIOS (director, gerente, asistente).
  canManageUsers: boolean;
  // Fuerza de usuarios que puede administrar (null = todas; director).
  manageFuerza: string | null;
  // Fuerza fija con la que registra (DP siempre registra como "destino").
  fuerzaFija: string | null;
  isDirector: boolean;
  isGerente: boolean;
  isAsistente: boolean;
  isVendedor: boolean;
  isDP: boolean; // pertenece a la fuerza Destinopropiedades.com
}

const ROLES_MANDO = ["director", "gerente", "asistente"];
const ROLES_VENDEDOR = ["vendedor", "lider_central", "lider_sitio"];

export async function getScope(user: SessionUser): Promise<Scope> {
  const isDP = user.fuerza === "destino";
  const manageFuerza = user.fuerza === "ambas" ? null : user.fuerza;

  if (user.role === "director") {
    return {
      projectIds: null, fuerza: null, excludeDestino: false,
      canRegister: true, canAdmin: true, canManageInventory: true,
      canViewInventory: true, canManageUsers: true, manageFuerza: null,
      fuerzaFija: null,
      isDirector: true, isGerente: false, isAsistente: false, isVendedor: false, isDP,
    };
  }

  // Capa de mando (gerentes y asistentes): TRANSPARENCIA — ven toda la
  // actividad de todos los proyectos y fuerzas. Administran a los usuarios de
  // su fuerza. El gerente gestiona inventario; la asistente no edita precios.
  if (ROLES_MANDO.includes(user.role)) {
    const esGerente = user.role === "gerente";
    return {
      projectIds: null, fuerza: null, excludeDestino: false,
      canRegister: true, canAdmin: false,
      canManageInventory: esGerente,
      canViewInventory: true,
      canManageUsers: true, manageFuerza,
      fuerzaFija: isDP ? "destino" : manageFuerza,
      isDirector: false, isGerente: esGerente, isAsistente: !esGerente,
      isVendedor: false, isDP,
    };
  }

  // Vendedor de la fuerza DP: ve TODO el inventario (solo-lectura), registra
  // como "destino" y ve solo la actividad de DP.
  if (isDP) {
    return {
      projectIds: null, fuerza: "destino", excludeDestino: false,
      canRegister: true, canAdmin: false, canManageInventory: false,
      canViewInventory: true, canManageUsers: false, manageFuerza: null,
      fuerzaFija: "destino",
      isDirector: false, isGerente: false, isAsistente: false, isVendedor: true, isDP: true,
    };
  }

  // Vendedor interno (Chacón): proyectos asignados y SOLO su fuerza (no ve la
  // actividad de las otras fuerzas — evita fricción entre equipos).
  const assignments = await prisma.projectAssignment.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  const projectIds = assignments.map((a) => a.projectId);
  const fuerzaVend = user.fuerza && user.fuerza !== "ambas" ? user.fuerza : "interna";
  return {
    projectIds, fuerza: fuerzaVend, excludeDestino: true,
    canRegister: true, canAdmin: false, canManageInventory: false,
    canViewInventory: false, canManageUsers: false, manageFuerza: null,
    fuerzaFija: fuerzaVend,
    isDirector: false, isGerente: false, isAsistente: false, isVendedor: true, isDP: false,
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
