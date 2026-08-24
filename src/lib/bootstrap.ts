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
  { codigo: "GIC-20", nombre: "Condado Villa Lourdes", departamento: "La Libertad", municipio: "Lourdes, Colón", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
];

/**
 * PILOTOS — proyectos que entran a OVI antes que el resto. Su gente arranca
 * con los frenos levantados (`modoPiloto`): carga su propio inventario y
 * bloquea y desbloquea lotes sin adjuntar boleta, para que la implementación
 * no se trabe. Cuando el equipo ya opera solo se apaga el marcador desde el
 * panel de Usuarios, persona por persona, y quedan con las reglas normales.
 *
 * Para sumar un proyecto al piloto basta con agregarlo a esta lista.
 */
export const PILOTOS = [
  {
    codigoProyecto: "GIC-06", // Nuevo San Vicente
    /** Cupo genérico del proyecto: sobra al haber personas con nombre propio. */
    cupoGenerico: "ventasNuevosanvicente",
    asesoras: [
      { username: "liz", displayName: "Liz" },
      { username: "clarita", displayName: "Clarita" },
      { username: "gaby", displayName: "Gaby" },
    ],
  },
  {
    codigoProyecto: "GIC-03", // Adelaida City
    cupoGenerico: "ventasAdelaidacity",
    asesoras: [{ username: "meyvelin", displayName: "Meyvelin" }],
  },
  {
    codigoProyecto: "GIC-14", // Vía Bypass — el proyecto del Bypass, en Usulután
    cupoGenerico: "ventasViabypass",
    asesoras: [{ username: "karla", displayName: "Karla" }],
  },
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
  // Asegura que los proyectos OFICIALES existan (crea los que falten por
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

  // Restablecimientos puntuales pedidos por la Gerencia. Cada uno corre una
  // sola vez, gracias a su marca; para repetir uno más adelante se agrega una
  // línea nueva con una marca nueva, nunca se edita la de arriba.
  await restablecerClaveInicial("clarita", "reset:clarita:2026-08-24");

  bootstrapped = true;
}

// ---------------------------------------------------------------
//  Estructura organizacional: gerentes, asistentes y vendedores con jerarquía.
//  Cada usuario es un "cupo" que la asistente/gerente completa con la persona
//  real (nombre, correo, celular). Contraseña inicial "password" (a cambiar).
// ---------------------------------------------------------------
async function upsertUser(u: {
  username: string; role: string; displayName: string; fuerza: string;
  supervisorId?: string | null; modoPiloto?: boolean;
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
      modoPiloto: u.modoPiloto === true,
    },
  });
  return created.id;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Usuario de ventas de sitio a partir del nombre del proyecto:
 *   "Condado Villa Lourdes" → "ventasCondadovillalourdes"
 *   "Vía Bypass"            → "ventasViabypass"
 * El ingreso NO distingue mayúsculas, así que la capital es solo para leerlo
 * más fácil: "ventasbypass" también entra.
 */
export function usuarioVentas(nombreProyecto: string): string {
  const base = nombreProyecto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^A-Za-z0-9]+/g, "") // solo letras y números
    .toLowerCase();
  if (!base) return "ventas";
  return "ventas" + base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Renombra un usuario del esquema anterior al nuevo, conservando su historial,
 * su contraseña y su asignación de proyecto. Si el nombre nuevo ya existe o el
 * viejo ya no está, no hace nada (idempotente).
 */
async function renombrarUsuario(viejo: string, nuevo: string, displayName: string) {
  if (viejo.toLowerCase() === nuevo.toLowerCase()) return;
  const u = await prisma.user.findFirst({
    where: { username: { equals: viejo, mode: "insensitive" } },
  });
  if (!u) return;
  const ocupado = await prisma.user.findFirst({
    where: { username: { equals: nuevo, mode: "insensitive" } },
  });
  if (ocupado) return;
  // El nombre visible solo se actualiza si sigue siendo el automático: si la
  // asistente ya puso a la persona real, se respeta.
  const esAutomatico = /^(Vendedor (Interna|UCOES|DP) \d+)$/.test(u.displayName.trim());
  await prisma.user.update({
    where: { id: u.id },
    data: { username: nuevo, ...(esAutomatico ? { displayName } : {}) },
  });
}

/**
 * Renombra un usuario y le devuelve la contraseña inicial, UNA SOLA VEZ: si el
 * usuario viejo ya no existe (porque el cambio ya ocurrió), no hace nada. Así
 * un despliegue posterior no le vuelve a borrar la contraseña que la persona
 * haya escogido.
 */
async function renombrarConClaveInicial(viejo: string, nuevo: string) {
  const u = await prisma.user.findFirst({
    where: { username: { equals: viejo, mode: "insensitive" } },
  });
  if (!u) return;
  const ocupado = await prisma.user.findFirst({
    where: { username: { equals: nuevo, mode: "insensitive" } },
  });
  if (ocupado) return;
  await prisma.user.update({
    where: { id: u.id },
    data: {
      username: nuevo,
      passwordHash: hashPassword("password"),
      mustChangePassword: true,
      // El cambio de contraseña cierra cualquier sesión abierta anterior.
      sessionEpoch: { increment: 1 },
    },
  });
}

/**
 * Devuelve a un usuario la contraseña inicial («password»), UNA SOLA VEZ.
 *
 * El arranque corre en cada despliegue, así que un restablecimiento suelto
 * aquí se repetiría siempre y le borraría a la persona la contraseña que
 * acababa de escoger. Por eso queda anotado en `OperacionUnica` con una marca:
 * mientras esa marca exista, no se vuelve a tocar. Para repetirlo a propósito
 * —otro olvido más adelante— se usa una marca nueva.
 */
async function restablecerClaveInicial(username: string, marca: string) {
  const yaCorrio = await prisma.operacionUnica.findUnique({ where: { clave: marca } });
  if (yaCorrio) return;

  const u = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });
  if (u) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        passwordHash: hashPassword("password"),
        // Al entrar, OVI la lleva sola a escoger una nueva.
        mustChangePassword: true,
        // Restablecer cierra cualquier sesión abierta con la clave anterior.
        sessionEpoch: { increment: 1 },
      },
    });
  }
  // Se anota aunque el usuario no exista: la operación ya se intentó y no debe
  // quedar armada, esperando a que alguien cree un usuario con ese nombre.
  await prisma.operacionUnica.create({ data: { clave: marca } });
}

/** Retira un cupo que sobra: se borra si nunca se usó; si no, se desactiva. */
async function retirarCupo(username: string) {
  const u = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    include: {
      _count: { select: { visitas: true, negocios: true, abonos: true, novedades: true, registros: true, subordinados: true } },
    },
  });
  if (!u) return;
  const c = u._count;
  const sinUso = !c.visitas && !c.negocios && !c.abonos && !c.novedades && !c.registros && !c.subordinados;
  if (sinUso) {
    await prisma.projectAssignment.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
  } else if (u.activo) {
    // Tiene historial: se conserva para trazabilidad, solo pierde el acceso.
    await prisma.user.update({ where: { id: u.id }, data: { activo: false } });
  }
}

export async function ensureOrgUsers(): Promise<void> {
  const dir1 = await prisma.user.findFirst({ where: { username: "director1" } });
  const dir2 = await prisma.user.findFirst({ where: { username: "director2" } });
  const projects = await prisma.project.findMany({ orderBy: { codigo: "asc" } });

  // --- Capa de mando por fuerza ---
  const gInterna = await upsertUser({ username: "gerente_interna", role: "gerente", displayName: "Gerente de Ventas — Interna", fuerza: "interna", supervisorId: dir1?.id });
  // La asistente ejecutiva de la fuerza Interna usa su nombre como usuario.
  // Se renombra conservando rol, permisos, historial y jerarquía: lo único que
  // cambia es cómo se identifica al entrar.
  await renombrarConClaveInicial("asist_interna", "pamela");
  const aInterna = await upsertUser({ username: "pamela", role: "asistente", displayName: "Asistente Ejecutiva — Interna", fuerza: "interna", supervisorId: gInterna });
  const gUcoes = await upsertUser({ username: "gerente_ucoes", role: "gerente", displayName: "Gerente de Ventas — UCOES", fuerza: "ucoes", supervisorId: dir1?.id });
  const aUcoes = await upsertUser({ username: "asist_ucoes", role: "asistente", displayName: "Asistente Ejecutiva — UCOES", fuerza: "ucoes", supervisorId: gUcoes });
  const aDp = await upsertUser({ username: "asist_dp", role: "asistente", displayName: "Asistente Ejecutiva — Destinopropiedades.com", fuerza: "destino", supervisorId: dir2?.id });

  // --- Ventas de sitio: un usuario por proyecto ---------------------------
  // El usuario se llama como el proyecto (ventasBypass, ventasCondadovillalourdes)
  // para que se recuerde sin lista. Ve y actualiza el inventario de SU proyecto.
  const usados = new Set<string>();
  for (const proj of projects) {
    let username = usuarioVentas(proj.nombre);
    // Desempate por si dos proyectos generan el mismo usuario.
    if (usados.has(username.toLowerCase())) username += proj.codigo.replace(/\D/g, "");
    usados.add(username.toLowerCase());
    const nombre = `Ventas — ${proj.nombre}`;

    // Migración desde el esquema anterior (v_interna_NN), conservando el
    // usuario y por lo tanto su historial y su asignación de proyecto.
    const n = proj.codigo.trim().toUpperCase().replace(/^GIC-/, "");
    if (/^\d+$/.test(n)) await renombrarUsuario(`v_interna_${pad(+n)}`, username, nombre);

    const uid = await upsertUser({ username, role: "vendedor", displayName: nombre, fuerza: "interna", supervisorId: aInterna });
    // Solo se asigna si el usuario no tiene ya proyecto: nunca se pisa una
    // reasignación hecha por la asistente desde el panel de usuarios.
    if ((await prisma.projectAssignment.count({ where: { userId: uid } })) === 0) {
      await prisma.projectAssignment.create({ data: { userId: uid, projectId: proj.id } });
    }
  }

  // --- UCOES: 10, itinerantes -------------------------------------------
  // Ven el inventario de TODOS los proyectos, así que no llevan proyecto fijo.
  for (let i = 1; i <= 10; i++) {
    const nombre = `Vendedor UCOES ${i}`;
    await renombrarUsuario(`v_ucoes_${pad(i)}`, `vucoes${i}`, nombre);
    const uid = await upsertUser({ username: `vucoes${i}`, role: "vendedor", displayName: nombre, fuerza: "ucoes", supervisorId: aUcoes });
    await prisma.projectAssignment.deleteMany({ where: { userId: uid } });
  }
  // Los cupos UCOES 11..20 se crearon cuando UCOES iba por proyecto. Con la
  // fuerza itinerante sobran: se retiran si nunca se usaron.
  for (let i = 11; i <= 20; i++) await retirarCupo(`v_ucoes_${pad(i)}`);

  // --- Destinopropiedades.com: 10, itinerantes ---------------------------
  for (let i = 1; i <= 10; i++) {
    const nombre = `Vendedor DP ${i}`;
    await renombrarUsuario(`v_dp_${pad(i)}`, `vdp${i}`, nombre);
    const uid = await upsertUser({ username: `vdp${i}`, role: "vendedor", displayName: nombre, fuerza: "destino", supervisorId: aDp });
    await prisma.projectAssignment.deleteMany({ where: { userId: uid } });
  }

  // --- PILOTOS: la gente de los proyectos que van primero ----------------
  for (const piloto of PILOTOS) {
    const proy = projects.find((p) => p.codigo === piloto.codigoProyecto);
    if (!proy) continue;
    for (const a of piloto.asesoras) {
      const uid = await upsertUser({
        username: a.username,
        role: "vendedor",
        displayName: a.displayName,
        fuerza: "interna",
        supervisorId: aInterna,
        modoPiloto: true,
      });
      // El marcador se re-afirma en cada arranque solo si nadie lo apagó a
      // mano: `upsertUser` no toca a los usuarios que ya existen, así que
      // apagarlo desde el panel de Usuarios es definitivo.
      if ((await prisma.projectAssignment.count({ where: { userId: uid } })) === 0) {
        await prisma.projectAssignment.create({
          data: { userId: uid, projectId: proy.id },
        });
      }
    }
    // El cupo genérico del proyecto sobra: ya hay personas con nombre propio.
    await prisma.user.updateMany({
      where: { username: { equals: piloto.cupoGenerico, mode: "insensitive" }, activo: true },
      data: { activo: false },
    });
  }
}
