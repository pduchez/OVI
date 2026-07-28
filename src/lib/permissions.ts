/**
 * Alcance de datos por rol (quién ve qué).
 *
 *  director            → todo, y administra el sistema.
 *  gerente / asistente → toda la actividad de todos los proyectos (transparencia).
 *  ventas<Proyecto>    → su proyecto: registra y actualiza el estado de SUS lotes.
 *  vucoes / vdp        → ven el inventario de TODOS los proyectos y venden en
 *                        cualquiera; su actividad queda en su propia fuerza.
 *
 * Hay DOS alcances distintos y no se deben confundir:
 *   projectIds          → de qué proyectos ve la ACTIVIDAD (visitas, negocios…).
 *   inventoryProjectIds → de qué proyectos ve el INVENTARIO (lotes y precios).
 * UCOES y DP tienen inventario abierto pero actividad acotada a su fuerza.
 */
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export interface Scope {
  // null = sin restricción (todos los proyectos). Array = ids permitidos.
  projectIds: string[] | null;
  // Proyectos cuyo inventario puede ver. null = todos.
  inventoryProjectIds: string[] | null;
  // null = todas las fuerzas visibles. "interna"|"ucoes"|"destino" = solo esa.
  fuerza: string | null;
  // Oculta la actividad de la fuerza Destinopropiedades.com (para Chacón).
  excludeDestino: boolean;
  canRegister: boolean; // puede capturar movimientos
  canAdmin: boolean; // director: configuración global (proyectos, seguridad)
  // Gerentes de ventas + directores: cargan inventario y FIJAN precios.
  canManageInventory: boolean;
  // Puede VER el inventario (todos menos quien no tenga proyecto asignado).
  canViewInventory: boolean;
  // Puede marcar un lote como reservado/vendido desde el inventario. Es la
  // idea central de OVI: el estado real del lote, desde el campo y al momento.
  canSetLoteEstado: boolean;
  // Puede devolver un lote a disponible (revertir). Solo la capa de mando.
  canLiberarLote: boolean;
  // Toda reserva/venta suya debe ir respaldada con boleta de depósito. La capa
  // de mando puede registrar sin boleta (excepción, y queda en la bitácora).
  requiereBoleta: boolean;
  // Puede administrar USUARIOS (director, gerente, asistente).
  canManageUsers: boolean;
  // Fuerza de usuarios que puede administrar (null = todas; director).
  manageFuerza: string | null;
  // Fuerza fija con la que registra (UCOES y DP registran siempre en la suya).
  fuerzaFija: string | null;
  isDirector: boolean;
  isGerente: boolean;
  isAsistente: boolean;
  isVendedor: boolean;
  isDP: boolean; // pertenece a la fuerza Destinopropiedades.com
}

const ROLES_MANDO = ["director", "gerente", "asistente"];

export async function getScope(user: SessionUser): Promise<Scope> {
  const isDP = user.fuerza === "destino";
  const manageFuerza = user.fuerza === "ambas" ? null : user.fuerza;

  if (user.role === "director") {
    return {
      projectIds: null, inventoryProjectIds: null, fuerza: null, excludeDestino: false,
      canRegister: true, canAdmin: true, canManageInventory: true,
      canViewInventory: true, canSetLoteEstado: true, canLiberarLote: true,
      requiereBoleta: false,
      canManageUsers: true, manageFuerza: null, fuerzaFija: null,
      isDirector: true, isGerente: false, isAsistente: false, isVendedor: false, isDP,
    };
  }

  // Capa de mando (gerentes y asistentes): TRANSPARENCIA — ven toda la
  // actividad de todos los proyectos y fuerzas. Administran a los usuarios de
  // su fuerza. El gerente fija precios; la asistente no.
  if (ROLES_MANDO.includes(user.role)) {
    const esGerente = user.role === "gerente";
    return {
      projectIds: null, inventoryProjectIds: null, fuerza: null, excludeDestino: false,
      canRegister: true, canAdmin: false,
      canManageInventory: esGerente,
      canViewInventory: true, canSetLoteEstado: true, canLiberarLote: true,
      requiereBoleta: false,
      canManageUsers: true, manageFuerza,
      fuerzaFija: isDP ? "destino" : manageFuerza,
      isDirector: false, isGerente: esGerente, isAsistente: !esGerente,
      isVendedor: false, isDP,
    };
  }

  // --- De aquí abajo, vendedores ---

  // UCOES y DP son fuerzas itinerantes: venden en CUALQUIER proyecto, así que
  // ven el inventario completo. Su actividad sí queda acotada a su fuerza.
  if (isDP || user.fuerza === "ucoes") {
    const fuerza = isDP ? "destino" : "ucoes";
    return {
      projectIds: null, inventoryProjectIds: null, fuerza, excludeDestino: !isDP,
      canRegister: true, canAdmin: false, canManageInventory: false,
      canViewInventory: true, canSetLoteEstado: true, canLiberarLote: false,
      requiereBoleta: true,
      canManageUsers: false, manageFuerza: null, fuerzaFija: fuerza,
      isDirector: false, isGerente: false, isAsistente: false, isVendedor: true, isDP,
    };
  }

  // Ventas de sitio (ventas<Proyecto>): su proyecto y su fuerza. Ve el
  // inventario de su proyecto y actualiza el estado de sus lotes, pero no
  // toca precios ni ve la actividad de las otras fuerzas.
  const assignments = await prisma.projectAssignment.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  const projectIds = assignments.map((a) => a.projectId);
  return {
    projectIds, inventoryProjectIds: projectIds, fuerza: "interna", excludeDestino: true,
    canRegister: true, canAdmin: false, canManageInventory: false,
    canViewInventory: projectIds.length > 0, canSetLoteEstado: true,
    canLiberarLote: false, requiereBoleta: true,
    canManageUsers: false, manageFuerza: null, fuerzaFija: "interna",
    isDirector: false, isGerente: false, isAsistente: false, isVendedor: true, isDP: false,
  };
}

/** Cláusula `where` de Prisma para proyectos, según el alcance. */
export function projectWhere(scope: Scope): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  // La asignación ya acota al usuario de sitio; UCOES y DP venden en todos los
  // proyectos. No se filtra por fuerza del proyecto: haría desaparecer el
  // proyecto asignado a un usuario si alguien le cambia la fuerza.
  if (scope.projectIds) where.id = { in: scope.projectIds };
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

/** ¿El usuario puede tocar la ACTIVIDAD de este proyecto? */
export function canAccessProject(scope: Scope, projectId: string): boolean {
  if (!scope.projectIds) return true;
  return scope.projectIds.includes(projectId);
}

/** ¿El usuario puede ver el INVENTARIO de este proyecto? */
export function canAccessInventario(scope: Scope, projectId: string): boolean {
  if (!scope.canViewInventory) return false;
  if (!scope.inventoryProjectIds) return true;
  return scope.inventoryProjectIds.includes(projectId);
}
