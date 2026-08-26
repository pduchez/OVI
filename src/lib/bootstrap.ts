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
import { GIC06_LOTES, type LoteDato } from "@/lib/datos/gic06-nuevo-san-vicente";

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
  // Alta pedida por Gerencia. Departamento y municipio quedan en blanco a
  // propósito: no se dieron, e inventarlos sería peor que dejarlos vacíos
  // para que Dirección los complete desde Administración → Proyectos.
  { codigo: "GIC-21", nombre: "Altos de Las Mercedes", departamento: "", municipio: "", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
  // Etapa en venta de Condado Hilo de Oro. Va como proyecto propio porque
  // tiene sus lotes y sus precios, igual que Cumbres de Santiago.
  { codigo: "GIC-22", nombre: "Brisas del Valle", departamento: "Cabañas", municipio: "Ilobasco", fuerza: "ambas", totalLotes: 0, precioDesde: 0 },
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
    /** Etapas del mismo proyecto van juntas: las lleva la misma persona. */
    codigos: ["GIC-06"], // Nuevo San Vicente
    /** Cupos genéricos que sobran al haber personas con nombre propio. */
    cupos: ["ventasNuevosanvicente"],
    asesoras: [
      { username: "liz", displayName: "Liz" },
      { username: "clarita", displayName: "Clarita" },
      { username: "gaby", displayName: "Gaby" },
    ],
  },
  {
    codigos: ["GIC-03"], // Adelaida City
    cupos: ["ventasAdelaidacity"],
    asesoras: [{ username: "meyvelin", displayName: "Meyvelin" }],
  },
  {
    codigos: ["GIC-14"], // Vía Bypass — el proyecto del Bypass, en Usulután
    cupos: ["ventasViabypass"],
    asesoras: [{ username: "karla", displayName: "Karla" }],
  },
  {
    codigos: ["GIC-19"], // Condado El Triunfo
    cupos: ["ventasCondadoeltriunfo"],
    asesoras: [{ username: "luci", displayName: "Luci" }],
  },
  {
    codigos: ["GIC-13"], // Condado del Golfo
    cupos: ["ventasCondadodelgolfo"],
    asesoras: [{ username: "kenia", displayName: "Kenia Hernández" }],
  },
  {
    codigos: ["GIC-04"], // Vista al Mar
    cupos: ["ventasVistaalmar"],
    asesoras: [{ username: "mirna", displayName: "Mirna" }],
  },
  {
    codigos: ["GIC-18"], // Panamerican City
    cupos: ["ventasPanamericancity"],
    asesoras: [{ username: "alexander", displayName: "Alexander" }],
  },
  {
    // Concepción lleva dos proyectos, cada uno con su etapa en venta:
    // Hilo de Oro vende Brisas del Valle, y Colina City vende Helen City.
    // Los cuatro están en OVI como listas propias: cada una tiene sus lotes.
    codigos: ["GIC-07", "GIC-22", "GIC-10", "GIC-11"],
    cupos: [
      "ventasCondadohilodeoro", "ventasBrisasdelvalle",
      "ventasColinacity", "ventasHelencity",
    ],
    asesoras: [{ username: "concepcion", displayName: "Concepción" }],
  },
  {
    codigos: ["GIC-21"], // Altos de Las Mercedes
    cupos: ["ventasAltosdelasmercedes"],
    asesoras: [{ username: "dalila", displayName: "Dalila" }],
  },
  {
    // Santiago City y Cumbres de Santiago son ETAPAS del mismo proyecto, no
    // dos proyectos distintos: las lleva una sola persona y por eso van en
    // una sola sección. En OVI siguen siendo dos inventarios separados,
    // porque tienen lotes y precios propios.
    codigos: ["GIC-15", "GIC-17"],
    cupos: ["ventasSantiagocity", "ventasCumbresdesantiago"],
    asesoras: [{ username: "morena", displayName: "Morena" }],
  },
];

/**
 * Destinopropiedades.com: cinco personas con nombre propio, que sustituyen a
 * los cupos genéricos `vdp1..vdp5`.
 *
 * Es el MISMO usuario renombrado, no uno nuevo: conserva su historial, su
 * jerarquía y todo lo que haya registrado. Siguen siendo ITINERANTES —sin
 * proyecto asignado a propósito— porque ven la disponibilidad de TODOS los
 * proyectos; ponerles un proyecto fijo se la recortaría (ver `getScope`).
 */
export const VENDEDORES_DP = [
  { cupo: "vdp1", legado: "v_dp_01", username: "william", displayName: "William" },
  { cupo: "vdp2", legado: "v_dp_02", username: "anes", displayName: "Anes" },
  { cupo: "vdp3", legado: "v_dp_03", username: "irma", displayName: "Irma" },
  { cupo: "vdp4", legado: "v_dp_04", username: "josue", displayName: "Josué" },
  { cupo: "vdp5", legado: "v_dp_05", username: "gerardo", displayName: "Gerardo" },
];

/**
 * Cupos de DP que ya no se ocupan: la fuerza quedó con cinco personas de
 * nombre propio y los cinco restantes nunca tuvieron dueño. Se retiran de la
 * base. Van las dos escrituras —`vdp6` y `v_dp_06`— porque puede existir
 * cualquiera de las dos según cuándo se haya creado el cupo.
 */
export const CUPOS_DP_RETIRADOS = [
  "vdp6", "vdp7", "vdp8", "vdp9", "vdp10",
  "v_dp_06", "v_dp_07", "v_dp_08", "v_dp_09", "v_dp_10",
];

export const SEED_VENDEDORES = [
  { nombre: "Ana Martínez", fuerza: "interna" },
  { nombre: "Carlos Rivas", fuerza: "interna" },
  { nombre: "Gabriela Flores", fuerza: "interna" },
  { nombre: "José Hernández", fuerza: "ucoes" },
  { nombre: "María López", fuerza: "ucoes" },
  { nombre: "Roberto Cruz", fuerza: "ucoes" },
  // El crédito de una venta de DP va al nombre de quien la hizo. Antes eran
  // dos cupos sin dueño («Vendedor DP 1» y «Vendedor DP 2»); ahora son las
  // cinco personas reales, y salen del mismo lugar que sus usuarios para que
  // no haya dos listas de nombres que se puedan desfasar.
  ...VENDEDORES_DP.map((v) => ({ nombre: v.displayName, fuerza: "destino" })),
];

/** Cupos del catálogo de vendedores que ya no se usan. */
const VENDEDORES_CATALOGO_RETIRADOS = ["Vendedor DP 1", "Vendedor DP 2"];

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
    const porCodigo = await prisma.project.findUnique({ where: { codigo: p.codigo } });
    if (porCodigo) continue;
    // Puede que Dirección ya lo haya dado de alta a mano con otro código: en
    // ese caso NO se crea un segundo, que dejaría el inventario partido en dos.
    const porNombre = await prisma.project.findFirst({
      where: { nombre: { equals: p.nombre, mode: "insensitive" } },
    });
    if (porNombre) continue;
    await prisma.project.create({ data: { ...p, estado: "activo" } });
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
  // Y retira los cupos sin dueño que sobran, ya que DP tiene sus cinco
  // nombres: un negocio acreditado a «Vendedor DP 1» no le sirve a nadie.
  for (const n of VENDEDORES_CATALOGO_RETIRADOS) await retirarVendedorCatalogo(n);

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
  await restablecerClaveInicial("luci", "reset:luci:2026-08-24");
  await restablecerClaveInicial("kenia", "reset:kenia:2026-08-26");

  // Corrección del inventario de Nuevo San Vicente. Ver la función.
  await cargarInventarioUnaVez(
    "GIC-06",
    GIC06_LOTES,
    "inventario:GIC-06:lotes-3-etapa:2026-08-24"
  );

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

/**
 * Deja el inventario de un proyecto EXACTAMENTE como dice una lista, una sola vez.
 *
 * Por qué existe: las asesoras de Nuevo San Vicente subieron su Excel cuando OVI
 * todavía no sabía leer el estado PINTADO de los lotes, así que los 293 entraron
 * como disponibles —y 96 de ellos no lo están—. Corregirlo pidiéndoles que
 * volvieran a subir el archivo era cargarles a ellas un error nuestro.
 *
 * Aplica las MISMAS reglas que una importación normal, que no se relajan por ser
 * una corrección:
 *  - Lo que trae la lista manda: lo que no venga en ella se retira.
 *  - Un lote CON HISTORIAL nunca se borra ni se le pisa el estado. Si alguien ya
 *    lo reservó o vendió desde OVI, eso vale más que cualquier lista.
 *
 * Corre una sola vez, anotada en `OperacionUnica`: el arranque se ejecuta en
 * cada despliegue y repetir esto le borraría a la gente su trabajo del día.
 */
async function cargarInventarioUnaVez(
  codigoProyecto: string,
  lista: LoteDato[],
  marca: string
) {
  const yaCorrio = await prisma.operacionUnica.findUnique({ where: { clave: marca } });
  if (yaCorrio) return;

  const proyecto = await prisma.project.findUnique({ where: { codigo: codigoProyecto } });
  if (!proyecto || !lista.length) return;
  const projectId = proyecto.id;

  for (const l of lista) {
    const existe = await prisma.lote.findUnique({
      where: { projectId_numero: { projectId, numero: l.numero } },
    });
    if (existe) {
      // Lo que se movió DENTRO de OVI vale más que la lista.
      const estado = ["reservado", "vendido"].includes(existe.estado) ? existe.estado : l.estado;
      await prisma.lote.update({
        where: { id: existe.id },
        data: { area: l.area, precio: l.precio, estado },
      });
    } else {
      await prisma.lote.create({
        data: { projectId, numero: l.numero, area: l.area, precio: l.precio, estado: l.estado, notas: "" },
      });
    }
  }

  // Lo que no viene en la lista se retira, salvo que tenga historial.
  const sobrantes = await prisma.lote.findMany({
    where: { projectId, numero: { notIn: lista.map((l) => l.numero) } },
    include: { _count: { select: { negocios: true } } },
  });
  const retirables = sobrantes.filter((l) => l.estado === "disponible" && l._count.negocios === 0);
  if (retirables.length) {
    await prisma.lote.deleteMany({ where: { id: { in: retirables.map((l) => l.id) } } });
  }

  await prisma.operacionUnica.create({ data: { clave: marca } });
}

/**
 * Le pone nombre propio a un cupo genérico, UNA SOLA VEZ.
 *
 * Cambia el usuario y el nombre visible, y le deja la contraseña inicial.
 * Sigue siendo el MISMO usuario: conserva su historial, su jerarquía y todo lo
 * que haya registrado; lo único que cambia es cómo se identifica al entrar.
 *
 * Va anotado con su marca porque el arranque corre en cada despliegue: suelto,
 * le borraría a la persona la contraseña que acababa de escoger. La marca se
 * escribe solo si el cambio de verdad ocurrió — si el cupo no existe (base
 * nueva) no hay nada que renombrar y el usuario nace ya con su nombre.
 */
async function darNombrePropio(
  cupo: string,
  username: string,
  displayName: string,
  marca: string
) {
  const yaCorrio = await prisma.operacionUnica.findUnique({ where: { clave: marca } });
  if (yaCorrio) return;

  const u = await prisma.user.findFirst({
    where: { username: { equals: cupo, mode: "insensitive" } },
  });
  if (!u) return;
  const ocupado = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });
  if (ocupado) return;

  await prisma.user.update({
    where: { id: u.id },
    data: {
      username,
      displayName,
      passwordHash: hashPassword("password"),
      // Al entrar, OVI la lleva sola a escoger una nueva.
      mustChangePassword: true,
      // Cambiar la contraseña cierra cualquier sesión abierta anterior.
      sessionEpoch: { increment: 1 },
    },
  });
  await prisma.operacionUnica.create({ data: { clave: marca } });
}

/**
 * Retira del catálogo un vendedor que sobra: se borra si nunca se le acreditó
 * nada; si ya tiene visitas o negocios se conserva desactivado, porque
 * borrarlo dejaría esos registros sin el nombre de quien los hizo.
 */
async function retirarVendedorCatalogo(nombre: string) {
  const v = await prisma.vendedor.findFirst({
    where: { nombre },
    include: { _count: { select: { visitas: true, negocios: true } } },
  });
  if (!v) return;
  if (!v._count.visitas && !v._count.negocios) {
    await prisma.vendedor.delete({ where: { id: v.id } });
  } else if (v.activo) {
    await prisma.vendedor.update({ where: { id: v.id }, data: { activo: false } });
  }
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
  // La asistente ejecutiva de Destinopropiedades.com es Priscila. Como
  // asistente ve y gestiona TODOS los proyectos —actividad e inventario, sin
  // proyecto que la acote— y administra a los usuarios de su fuerza. Fijar
  // precios sigue siendo de gerencia y dirección (ver `getScope`).
  await darNombrePropio("asist_dp", "priscila", "Priscila", "nombre:priscila:2026-08-26");
  const aDp = await upsertUser({ username: "priscila", role: "asistente", displayName: "Priscila", fuerza: "destino", supervisorId: dir2?.id });

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

  // --- Destinopropiedades.com: cinco personas, itinerantes ---------------
  // No llevan proyecto asignado A PROPÓSITO: ven la disponibilidad de todos
  // los proyectos, y asignarles uno se la recortaría a ese solo.
  for (const v of VENDEDORES_DP) {
    // Dos migraciones encadenadas, cada una conservando el mismo usuario y
    // por lo tanto su historial: v_dp_01 → vdp1 → william.
    await renombrarUsuario(v.legado, v.cupo, v.displayName);
    await darNombrePropio(v.cupo, v.username, v.displayName, `nombre:${v.username}:2026-08-26`);
    const uid = await upsertUser({ username: v.username, role: "vendedor", displayName: v.displayName, fuerza: "destino", supervisorId: aDp });
    await prisma.projectAssignment.deleteMany({ where: { userId: uid } });
  }
  // Los cupos DP que sobran salen de la base.
  for (const cupo of CUPOS_DP_RETIRADOS) await retirarCupo(cupo);

  // --- PILOTOS: la gente de los proyectos que van primero ----------------
  for (const piloto of PILOTOS) {
    // Por código, y si no aparece, por el nombre del catálogo: si Dirección
    // creó el proyecto a mano con otro código, la asesora igual queda asignada.
    const proyectos = piloto.codigos
      .map((c) => {
        const porCodigo = projects.find((p) => p.codigo === c);
        if (porCodigo) return porCodigo;
        const nombre = SEED_PROJECTS.find((p) => p.codigo === c)?.nombre;
        return nombre
          ? projects.find((p) => p.nombre.toLowerCase() === nombre.toLowerCase())
          : undefined;
      })
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (!proyectos.length) continue;

    for (const a of piloto.asesoras) {
      const uid = await upsertUser({
        username: a.username,
        role: "vendedor",
        displayName: a.displayName,
        fuerza: "interna",
        supervisorId: aInterna,
        modoPiloto: true,
      });
      // Cada asignación se hace UNA vez y queda anotada. Así una persona puede
      // llevar varias etapas, y si mañana alguien le quita una desde el panel
      // de Usuarios, el arranque siguiente no se la devuelve.
      for (const proy of proyectos) {
        const marca = `asignacion:${a.username}:${proy.codigo}`;
        const yaCorrio = await prisma.operacionUnica.findUnique({ where: { clave: marca } });
        if (yaCorrio) continue;
        await prisma.projectAssignment.createMany({
          data: { userId: uid, projectId: proy.id },
          skipDuplicates: true,
        });
        await prisma.operacionUnica.create({ data: { clave: marca } });
      }
    }

    // Los cupos genéricos sobran: ya hay personas con nombre propio.
    await prisma.user.updateMany({
      where: { username: { in: piloto.cupos }, activo: true },
      data: { activo: false },
    });
  }
}
