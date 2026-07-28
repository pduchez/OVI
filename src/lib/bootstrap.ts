/**
 * Bootstrap idempotente: crea los usuarios base, los proyectos iniciales y los
 * vendedores si la base está vacía. Se puede llamar en cada login sin costo.
 *
 * Los proyectos y usuarios son EDITABLES desde el panel del Director; los
 * valores aquí son un punto de partida realista para El Salvador que el Director
 * debe reemplazar por los datos reales del Grupo Chacón.
 */
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export const SEED_USERS = [
  { username: "director1", role: "director", displayName: "Director 1", fuerza: "ambas" },
  { username: "director2", role: "director", displayName: "Director 2", fuerza: "ambas" },
  { username: "claudia", role: "gerente", displayName: "Lic. Claudia (Oficina)", fuerza: "interna" },
  { username: "max", role: "gerente", displayName: "Lic. Max (UCOES)", fuerza: "ucoes" },
  { username: "central1", role: "lider_central", displayName: "Líder Central 1", fuerza: "ambas" },
  { username: "sitio1", role: "lider_sitio", displayName: "Líder Sitio 1", fuerza: "ambas" },
];

// Catálogo OFICIAL de proyectos del Grupo Inmobiliario Chacón (gichacon.com).
// El inventario (lotes/precios) se carga aparte desde el módulo Inventario.
export const SEED_PROJECTS = [
  { codigo: "GIC-01", nombre: "Riviera del Pacífico", departamento: "La Libertad", municipio: "Playa Suncita", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-02", nombre: "Salitrillo City", departamento: "Santa Ana", municipio: "Santa Ana", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-03", nombre: "Adelaida City", departamento: "Sonsonate", municipio: "Izalco", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-04", nombre: "Vista al Mar", departamento: "Sonsonate", municipio: "Acajutla", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-05", nombre: "Tecomapa City", departamento: "Santa Ana", municipio: "Metapán", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-06", nombre: "Nuevo San Vicente", departamento: "San Vicente", municipio: "San Vicente", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-07", nombre: "Condado Hilo de Oro", departamento: "Cabañas", municipio: "Ilobasco", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-08", nombre: "Portal Las Luces", departamento: "Chalatenango", municipio: "Chalatenango", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-09", nombre: "La Estancia", departamento: "La Libertad", municipio: "Colón", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-10", nombre: "Colina City", departamento: "Cabañas", municipio: "Ilobasco", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-11", nombre: "Helen City", departamento: "Cabañas", municipio: "Ilobasco", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-12", nombre: "El Porvenir", departamento: "La Libertad", municipio: "Colón", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-13", nombre: "Condado del Golfo", departamento: "La Unión", municipio: "La Unión", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-14", nombre: "Vía Bypass", departamento: "Usulután", municipio: "Usulután", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-15", nombre: "Santiago City", departamento: "Usulután", municipio: "Usulután", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-16", nombre: "Villa Santiago", departamento: "Usulután", municipio: "Usulután", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-17", nombre: "Cumbres de Santiago", departamento: "Usulután", municipio: "Santiago de María", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-18", nombre: "Panamerican City", departamento: "Usulután", municipio: "Usulután", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  { codigo: "GIC-19", nombre: "Condado El Triunfo", departamento: "Usulután", municipio: "Jiquilisco", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
];

export const SEED_VENDEDORES = [
  { nombre: "Ana Martínez", fuerza: "interna" },
  { nombre: "Carlos Rivas", fuerza: "interna" },
  { nombre: "Gabriela Flores", fuerza: "interna" },
  { nombre: "José Hernández", fuerza: "ucoes" },
  { nombre: "María López", fuerza: "ucoes" },
  { nombre: "Roberto Cruz", fuerza: "ucoes" },
];

let bootstrapped = false;

/** Crea usuarios/proyectos/vendedores base si aún no existen. Idempotente. */
export async function ensureBootstrap(): Promise<void> {
  if (bootstrapped) return;
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    for (const u of SEED_USERS) {
      await prisma.user.create({
        data: { ...u, passwordHash: hashPassword("password") },
      });
    }
  }
  const projCount = await prisma.project.count();
  if (projCount === 0) {
    for (const p of SEED_PROJECTS) {
      await prisma.project.create({ data: { ...p, estado: "activo" } });
    }
  }
  const vendCount = await prisma.vendedor.count();
  if (vendCount === 0) {
    for (const v of SEED_VENDEDORES) {
      await prisma.vendedor.create({ data: { ...v, activo: true } });
    }
  }

  // Asigna proyectos a los líderes de ejemplo si no tienen ninguno.
  const central = await prisma.user.findFirst({ where: { username: "central1" } });
  const sitio = await prisma.user.findFirst({ where: { username: "sitio1" } });
  const projects = await prisma.project.findMany({ orderBy: { codigo: "asc" } });
  if (central) {
    const has = await prisma.projectAssignment.count({ where: { userId: central.id } });
    if (has === 0 && projects.length >= 3) {
      for (const p of projects.slice(0, 3)) {
        await prisma.projectAssignment.create({
          data: { userId: central.id, projectId: p.id },
        });
      }
    }
  }
  if (sitio) {
    const has = await prisma.projectAssignment.count({ where: { userId: sitio.id } });
    if (has === 0 && projects.length >= 1) {
      await prisma.projectAssignment.create({
        data: { userId: sitio.id, projectId: projects[0].id },
      });
    }
  }

  bootstrapped = true;
}
