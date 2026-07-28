/**
 * Seed de OVI: usuarios base, proyectos, vendedores y datos de DEMOSTRACIÓN
 * (visitas, negocios, abonos, novedades) para que el tablero se vea poblado.
 * Ejecuta:  npm run db:seed
 *
 * Es idempotente a nivel de usuarios/proyectos/vendedores (no duplica), pero
 * SÍ agrega datos demo cada vez; úsalo en desarrollo, no en producción real.
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const USERS = [
  { username: "director1", role: "director", displayName: "Director 1", fuerza: "ambas" },
  { username: "director2", role: "director", displayName: "Director 2", fuerza: "ambas" },
  { username: "claudia", role: "gerente", displayName: "Lic. Claudia (Oficina)", fuerza: "interna" },
  { username: "max", role: "gerente", displayName: "Lic. Max (UCOES)", fuerza: "ucoes" },
  { username: "central1", role: "lider_central", displayName: "Líder Central 1", fuerza: "ambas" },
  { username: "sitio1", role: "lider_sitio", displayName: "Líder Sitio 1", fuerza: "ambas" },
];

const PROJECTS = [
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

const VENDEDORES = [
  { nombre: "Ana Martínez", fuerza: "interna" },
  { nombre: "Carlos Rivas", fuerza: "interna" },
  { nombre: "Gabriela Flores", fuerza: "interna" },
  { nombre: "José Hernández", fuerza: "ucoes" },
  { nombre: "María López", fuerza: "ucoes" },
  { nombre: "Roberto Cruz", fuerza: "ucoes" },
];

const NOMBRES = ["Juan Pérez", "María Gómez", "Luis Ramírez", "Sofía Torres", "Pedro Díaz", "Carmen Ruiz", "Jorge Castillo", "Elena Vargas", "Miguel Ángel Reyes", "Lucía Mena", "Óscar Portillo", "Rosa Alvarado"];
const CAIDAS = ["financiamiento", "desistio", "precio", "ubicacion", "atencion", "competencia"];
const ORIGENES = ["redes", "referido", "valla", "pasando", "evento", "otro"];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("Sembrando OVI…");

  if ((await prisma.user.count()) === 0) {
    for (const u of USERS) {
      await prisma.user.create({ data: { ...u, passwordHash: hashPassword("password") } });
    }
    console.log("· usuarios base creados (contraseña: password)");
  }
  if ((await prisma.project.count()) === 0) {
    for (const p of PROJECTS) await prisma.project.create({ data: { ...p, estado: "activo" } });
    console.log("· 15 proyectos creados");
  }
  if ((await prisma.vendedor.count()) === 0) {
    for (const v of VENDEDORES) await prisma.vendedor.create({ data: { ...v, activo: true } });
    console.log("· vendedores creados");
  }

  const projects = await prisma.project.findMany();
  const vendedores = await prisma.vendedor.findMany();
  const director = await prisma.user.findFirst({ where: { username: "director1" } });

  // Asignaciones de ejemplo
  const central = await prisma.user.findFirst({ where: { username: "central1" } });
  const sitio = await prisma.user.findFirst({ where: { username: "sitio1" } });
  if (central && (await prisma.projectAssignment.count({ where: { userId: central.id } })) === 0) {
    for (const p of projects.slice(0, 3))
      await prisma.projectAssignment.create({ data: { userId: central.id, projectId: p.id } });
  }
  if (sitio && (await prisma.projectAssignment.count({ where: { userId: sitio.id } })) === 0) {
    await prisma.projectAssignment.create({ data: { userId: sitio.id, projectId: projects[0].id } });
  }

  // Datos demo
  const vendInterna = vendedores.filter((v) => v.fuerza === "interna");
  const vendUcoes = vendedores.filter((v) => v.fuerza === "ucoes");

  let visitas = 0, negocios = 0, abonos = 0;

  for (const p of projects) {
    const nVisitas = 4 + Math.floor(Math.random() * 8);
    for (let i = 0; i < nVisitas; i++) {
      const esUcoes = p.fuerza === "ucoes" || (p.fuerza === "ambas" && Math.random() > 0.5);
      const vend = esUcoes ? rand(vendUcoes) : rand(vendInterna);
      const cliente = rand(NOMBRES);
      const fVisita = daysAgo(Math.floor(Math.random() * 60));
      const vis = await prisma.visita.create({
        data: {
          projectId: p.id,
          fecha: fVisita,
          clienteNombre: cliente,
          clienteTelefono: "7000-0000",
          vendedorId: vend?.id,
          fuerza: esUcoes ? "ucoes" : "interna",
          origen: rand(ORIGENES),
          interesado: Math.random() > 0.3,
          registradoPorId: director?.id,
        },
      });
      await prisma.registro.create({
        data: { tipo: "visita", projectId: p.id, refId: vis.id, resumen: `Visita de ${cliente}`, createdAt: fVisita, registradoPorId: director?.id },
      });
      visitas++;
    }

    const nNegocios = 2 + Math.floor(Math.random() * 5);
    for (let i = 0; i < nNegocios; i++) {
      const esUcoes = p.fuerza === "ucoes" || (p.fuerza === "ambas" && Math.random() > 0.5);
      const vend = esUcoes ? rand(vendUcoes) : rand(vendInterna);
      const precio = p.precioDesde + Math.floor(Math.random() * 3000);
      const r = Math.random();
      let estado = "reservado";
      if (r > 0.8) estado = "caido";
      else if (r > 0.55) estado = "vendido";
      else if (r > 0.45) estado = "escriturado";
      const fReserva = daysAgo(30 + Math.floor(Math.random() * 30));
      const fVenta = ["vendido", "escriturado", "en_mora"].includes(estado)
        ? daysAgo(Math.floor(Math.random() * 30))
        : null;
      const prima = Math.round(precio * 0.1);
      const neg = await prisma.negocio.create({
        data: {
          projectId: p.id,
          loteRef: `Lote ${1 + Math.floor(Math.random() * p.totalLotes)}`,
          clienteNombre: rand(NOMBRES),
          clienteTelefono: "7000-0000",
          vendedorId: vend?.id,
          fuerza: esUcoes ? "ucoes" : "interna",
          estado,
          precioLote: precio,
          prima,
          fechaReserva: fReserva,
          fechaVenta: fVenta,
          fechaEscritura: estado === "escriturado" ? fVenta : null,
          fechaCaida: estado === "caido" ? daysAgo(Math.floor(Math.random() * 20)) : null,
          motivoCaida: estado === "caido" ? rand(CAIDAS) : "",
          registradoPorId: director?.id,
        },
      });
      negocios++;
      const tipoReg = estado === "caido" ? "caida" : fVenta ? "venta" : "reserva";
      await prisma.registro.create({
        data: {
          tipo: tipoReg,
          projectId: p.id,
          refId: neg.id,
          resumen: `${tipoReg === "caida" ? "Caída" : tipoReg === "venta" ? "Venta" : "Reserva"} — ${neg.clienteNombre} (${neg.loteRef})`,
          monto: tipoReg === "caida" ? 0 : precio,
          createdAt: neg.fechaCaida || fVenta || fReserva,
          registradoPorId: director?.id,
        },
      });
      if (["vendido", "escriturado", "en_mora"].includes(estado)) {
        const cuotas = 1 + Math.floor(Math.random() * 4);
        const fPrima = fVenta || fReserva;
        await prisma.abono.create({
          data: { negocioId: neg.id, fecha: fPrima, monto: prima, tipo: "prima", metodo: "efectivo", registradoPorId: director?.id },
        });
        await prisma.registro.create({
          data: { tipo: "abono", projectId: p.id, refId: neg.id, resumen: `Prima de ${neg.clienteNombre}`, monto: prima, createdAt: fPrima, registradoPorId: director?.id },
        });
        abonos++;
        for (let c = 0; c < cuotas; c++) {
          const fCuota = daysAgo(Math.floor(Math.random() * 25));
          await prisma.abono.create({
            data: { negocioId: neg.id, fecha: fCuota, monto: 150, tipo: "cuota", metodo: "efectivo", registradoPorId: director?.id },
          });
          await prisma.registro.create({
            data: { tipo: "abono", projectId: p.id, refId: neg.id, resumen: `Abono de ${neg.clienteNombre}`, monto: 150, createdAt: fCuota, registradoPorId: director?.id },
          });
          abonos++;
        }
      }
    }
  }

  // Algunas novedades
  const novedades = [
    { categoria: "infraestructura", titulo: "Falta señalización en calle principal", prioridad: "media" },
    { categoria: "legal", titulo: "Pendiente escritura matriz de 3 lotes", prioridad: "alta" },
    { categoria: "cliente", titulo: "Reclamo por linderos del Lote 45", prioridad: "alta" },
    { categoria: "operativo", titulo: "Se necesita más personal fin de semana", prioridad: "baja" },
  ];
  for (const nv of novedades) {
    await prisma.novedad.create({
      data: { ...nv, projectId: rand(projects).id, detalle: "Registrado en el seed de demostración.", estado: "abierta", registradoPorId: director?.id },
    });
  }

  console.log(`· demo: ${visitas} visitas, ${negocios} negocios, ${abonos} abonos, ${novedades.length} novedades`);
  console.log("Listo. Entra con director1 / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
