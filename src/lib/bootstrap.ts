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

// 15 proyectos de arranque (placeholders realistas; reemplazar por los reales).
export const SEED_PROJECTS = [
  { codigo: "CHA-01", nombre: "Valle Verde", departamento: "La Libertad", municipio: "Zaragoza", fuerza: "interna", totalLotes: 120, precioDesde: 6500 },
  { codigo: "CHA-02", nombre: "Altos del Lago", departamento: "San Salvador", municipio: "Panchimalco", fuerza: "interna", totalLotes: 90, precioDesde: 8900 },
  { codigo: "CHA-03", nombre: "Prados de Santa Ana", departamento: "Santa Ana", municipio: "Santa Ana", fuerza: "ucoes", totalLotes: 200, precioDesde: 5200 },
  { codigo: "CHA-04", nombre: "Mirador del Volcán", departamento: "Sonsonate", municipio: "Izalco", fuerza: "ucoes", totalLotes: 150, precioDesde: 4800 },
  { codigo: "CHA-05", nombre: "Villas del Este", departamento: "San Miguel", municipio: "San Miguel", fuerza: "ambas", totalLotes: 180, precioDesde: 5500 },
  { codigo: "CHA-06", nombre: "Brisas de Usulután", departamento: "Usulután", municipio: "Usulután", fuerza: "ucoes", totalLotes: 110, precioDesde: 4200 },
  { codigo: "CHA-07", nombre: "Colinas de La Paz", departamento: "La Paz", municipio: "Zacatecoluca", fuerza: "interna", totalLotes: 130, precioDesde: 4900 },
  { codigo: "CHA-08", nombre: "Jardines de Ahuachapán", departamento: "Ahuachapán", municipio: "Ahuachapán", fuerza: "ucoes", totalLotes: 95, precioDesde: 4300 },
  { codigo: "CHA-09", nombre: "Paseo Cuscatlán", departamento: "Cuscatlán", municipio: "Cojutepeque", fuerza: "interna", totalLotes: 140, precioDesde: 5100 },
  { codigo: "CHA-10", nombre: "Bosques de Chalatenango", departamento: "Chalatenango", municipio: "Chalatenango", fuerza: "ucoes", totalLotes: 100, precioDesde: 3900 },
  { codigo: "CHA-11", nombre: "Vista Hermosa", departamento: "La Unión", municipio: "La Unión", fuerza: "ambas", totalLotes: 160, precioDesde: 4600 },
  { codigo: "CHA-12", nombre: "Portal de Morazán", departamento: "Morazán", municipio: "San Francisco Gotera", fuerza: "ucoes", totalLotes: 80, precioDesde: 3700 },
  { codigo: "CHA-13", nombre: "Lomas de San Vicente", departamento: "San Vicente", municipio: "San Vicente", fuerza: "interna", totalLotes: 115, precioDesde: 4400 },
  { codigo: "CHA-14", nombre: "Cumbres de Cabañas", departamento: "Cabañas", municipio: "Sensuntepeque", fuerza: "ucoes", totalLotes: 90, precioDesde: 3800 },
  { codigo: "CHA-15", nombre: "Rivera del Mar", departamento: "La Libertad", municipio: "La Libertad", fuerza: "ambas", totalLotes: 210, precioDesde: 9900 },
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
