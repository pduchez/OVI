/**
 * Identidad visual del Grupo Inmobiliario Chacón.
 *
 * Los logos se sirven como archivos estáticos desde /public/logos, nombrados
 * con el código del proyecto (GIC-01.png … GIC-20.png). Así no dependen de la
 * base de datos, se cachean en el navegador y pesan ~8 KB cada uno — importante
 * para el internet lento de los proyectos.
 */

/** Códigos que tienen logo disponible. */
const CON_LOGO = new Set([
  "GIC-01", "GIC-02", "GIC-03", "GIC-04", "GIC-05", "GIC-06", "GIC-07",
  "GIC-08", "GIC-09", "GIC-10", "GIC-11", "GIC-12", "GIC-13", "GIC-14",
  "GIC-15", "GIC-16", "GIC-17", "GIC-18", "GIC-19", "GIC-20",
]);

/** Ruta del logo de un proyecto, o null si aún no tiene. */
export function logoProyecto(codigo: string | null | undefined): string | null {
  const c = (codigo || "").trim().toUpperCase();
  return CON_LOGO.has(c) ? `/logos/${c}.png` : null;
}

/** Árbol del Grupo Chacón (imagen base de la marca). */
export const LOGO_ARBOL = "/logos/_arbol.png";

export const MARCA = {
  grupo: "Grupo Inmobiliario Chacón",
  app: "OVI",
  descripcion: "Central de ventas de lotes",
};
