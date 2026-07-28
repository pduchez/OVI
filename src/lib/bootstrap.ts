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
  { username: "director2", role: "director", displayName: "Director 2 (Pedro Pablo Duchez)", fuerza: "ambas" },
];

/// Usuarios de prueba previos a la estructura organizacional real. Se
/// DESACTIVAN automáticamente (no se borran: conservan historial/trazabilidad).
export const USUARIOS_OBSOLETOS = ["claudia", "max", "central1", "sitio1", "dp1"];

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
  { nombre: "Vendedor DP 1", fuerza: "destino" },
  { nombre: "Vendedor DP 2", fuerza: "destino" },
];

let bootstrapped = false;

/** Crea usuarios/proyectos/vendedores base si aún no existen. Idempotente. */
export async function ensureBootstrap(): Promise<void> {
  if (bootstrapped) return;
  // Asegura que los usuarios base existan (crea los que falten por username;
  // no toca la contraseña de los ya existentes).
  for (const u of SEED_USERS) {
    const ex = await prisma.user.findFirst({
      where: { username: { equals: u.username, mode: "insensitive" } },
    });
    if (!ex) {
      await prisma.user.create({ data: { ...u, passwordHash: hashPassword("password") } });
    }
  }
  // Asegura que los 19 proyectos OFICIALES existan (crea los que falten por
  // código; no sobreescribe ediciones del director en los existentes).
  for (const p of SEED_PROJECTS) {
    const ex = await prisma.project.findUnique({ where: { codigo: p.codigo } });
    if (!ex) await prisma.project.create({ data: { ...p, estado: "activo" } });
  }
  // Limpia placeholders antiguos (código CHA-*) que no tengan datos operativos.
  const legacy = await prisma.project.findMany({
    where: { codigo: { startsWith: "CHA-" } },
    include: { _count: { select: { lotes: true, negocios: true, visitas: true, novedades: true } } },
  });
  for (const l of legacy) {
    const c = l._count;
    if (!c.lotes && !c.negocios && !c.visitas && !c.novedades) {
      await prisma.projectAssignment.deleteMany({ where: { projectId: l.id } });
      await prisma.project.delete({ where: { id: l.id } });
    }
  }

  // Asegura los vendedores base (crea los que falten por nombre).
  for (const v of SEED_VENDEDORES) {
    const ex = await prisma.vendedor.findFirst({ where: { nombre: v.nombre } });
    if (!ex) await prisma.vendedor.create({ data: { ...v, activo: true } });
  }

  // Estructura organizacional (según el listado del Grupo Chacón).
  await ensureOrgUsers();

  // Desactiva los usuarios de prueba antiguos (previos a la estructura real).
  // No se borran: conservan su historial y trazabilidad, solo pierden acceso.
  await prisma.user.updateMany({
    where: { username: { in: USUARIOS_OBSOLETOS }, activo: true },
    data: { activo: false },
  });

  bootstrapped = true;
}

// ---------------------------------------------------------------
//  Estructura organizacional: gerentes, asistentes y vendedores con jerarquía.
//  Cada usuario es un "cupo" que la asistente/gerente completa con la persona
//  real (nombre, correo, celular). Contraseña inicial "password" (a cambiar).
// ---------------------------------------------------------------
async function upsertUser(u: {
  username: string; role: string; displayName: string; fuerza: string;
  supervisorId?: string | null;
}): Promise<string> {
  const ex = await prisma.user.findFirst({
    where: { username: { equals: u.username, mode: "insensitive" } },
  });
  if (ex) return ex.id;
  const created = await prisma.user.create({
    data: {
      username: u.username,
      role: u.role,
      displayName: u.displayName,
      fuerza: u.fuerza,
      supervisorId: u.supervisorId || null,
      passwordHash: hashPassword("password"),
      mustChangePassword: true,
    },
  });
  return created.id;
}

export async function ensureOrgUsers(): Promise<void> {
  const dir1 = await prisma.user.findFirst({ where: { username: "director1" } });
  const dir2 = await prisma.user.findFirst({ where: { username: "director2" } });
  const projects = await prisma.project.findMany({ orderBy: { codigo: "asc" } });

  // --- Capa de mando por fuerza ---
  const gInterna = await upsertUser({ username: "gerente_interna", role: "gerente", displayName: "Gerente de Ventas — Interna", fuerza: "interna", supervisorId: dir1?.id });
  const aInterna = await upsertUser({ username: "asist_interna", role: "asistente", displayName: "Asistente Ejecutiva — Interna", fuerza: "interna", supervisorId: gInterna });
  const gUcoes = await upsertUser({ username: "gerente_ucoes", role: "gerente", displayName: "Gerente de Ventas — UCOES", fuerza: "ucoes", supervisorId: dir1?.id });
  const aUcoes = await upsertUser({ username: "asist_ucoes", role: "asistente", displayName: "Asistente Ejecutiva — UCOES", fuerza: "ucoes", supervisorId: gUcoes });
  const aDp = await upsertUser({ username: "asist_dp", role: "asistente", displayName: "Asistente Ejecutiva — Destinopropiedades.com", fuerza: "destino", supervisorId: dir2?.id });

  // --- Vendedores (cupos) ---
  const pad = (n: number) => String(n).padStart(2, "0");
  // Interna: 19 (uno por proyecto).
  for (let i = 1; i <= 19; i++) {
    const uid = await upsertUser({ username: `v_interna_${pad(i)}`, role: "vendedor", displayName: `Vendedor Interna ${pad(i)}`, fuerza: "interna", supervisorId: aInterna });
    const proj = projects[i - 1];
    if (proj && (await prisma.projectAssignment.count({ where: { userId: uid } })) === 0)
      await prisma.projectAssignment.create({ data: { userId: uid, projectId: proj.id } });
  }
  // UCOES: 10 (uno por proyecto).
  for (let i = 1; i <= 10; i++) {
    const uid = await upsertUser({ username: `v_ucoes_${pad(i)}`, role: "vendedor", displayName: `Vendedor UCOES ${pad(i)}`, fuerza: "ucoes", supervisorId: aUcoes });
    const proj = projects[i - 1];
    if (proj && (await prisma.projectAssignment.count({ where: { userId: uid } })) === 0)
      await prisma.projectAssignment.create({ data: { userId: uid, projectId: proj.id } });
  }
  // Destinopropiedades.com: 10 (ven todo el inventario; sin proyecto fijo).
  for (let i = 1; i <= 10; i++) {
    await upsertUser({ username: `v_dp_${pad(i)}`, role: "vendedor", displayName: `Vendedor DP ${pad(i)}`, fuerza: "destino", supervisorId: aDp });
  }
}
