/**
 * Guardias de autorización para páginas (Server Components).
 *
 * Ocultar un enlace del menú NO es control de acceso: quien escriba la URL
 * a mano llega igual. Toda página privada debe declarar aquí qué exige, y la
 * guardia redirige a quien no lo cumpla. Las Server Actions tienen sus
 * propias guardias (lanzan error en vez de redirigir).
 */
import { redirect } from "next/navigation";
import { requireUser, type SessionUser } from "@/lib/auth";
import { getScope, type Scope } from "@/lib/permissions";

export interface Sesion {
  user: SessionUser;
  scope: Scope;
}

/** Sesión válida + alcance calculado. Redirige al login si no hay sesión. */
export async function requireSession(): Promise<Sesion> {
  const user = await requireUser();
  const scope = await getScope(user);
  return { user, scope };
}

/**
 * Exige una capacidad concreta del alcance. A quien no la tenga se le manda
 * al tablero (no a una pantalla de error: no se le confirma que la sección
 * existe ni qué hay dentro).
 */
export async function requireCapacidad(
  capacidad: "canAdmin" | "canManageUsers" | "canManageInventory" | "canViewInventory" | "canRegister"
): Promise<Sesion> {
  const s = await requireSession();
  if (!s.scope[capacidad]) redirect("/");
  return s;
}

/** Solo la Dirección: configuración global, proyectos y bitácora de seguridad. */
export async function requireAdmin(): Promise<Sesion> {
  return requireCapacidad("canAdmin");
}
