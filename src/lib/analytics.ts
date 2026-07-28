/**
 * Analítica de OVI: KPIs del dashboard y agregaciones para los reportes.
 * Todo respeta el `Scope` del usuario (qué proyectos/fuerza puede ver).
 */
import { prisma } from "@/lib/db";
import type { Scope } from "@/lib/permissions";
import { movimientoWhere } from "@/lib/permissions";
import { ESTADOS_VENTA_VIVA } from "@/lib/constants";

function rangeWhere(desde?: Date, hasta?: Date) {
  if (!desde && !hasta) return {};
  const f: Record<string, Date> = {};
  if (desde) f.gte = desde;
  if (hasta) f.lte = hasta;
  return f;
}

export interface Kpis {
  visitas: number;
  reservas: number;
  ventas: number;
  caidas: number;
  montoVendido: number;
  cobrado: number;
  novedadesAbiertas: number;
  conversion: number; // % visitas → venta
}

export async function dashboardKpis(
  scope: Scope,
  desde: Date,
  hasta: Date
): Promise<Kpis> {
  const base = movimientoWhere(scope);
  const rango = rangeWhere(desde, hasta);

  const [visitas, reservas, ventas, caidas, ventaAgg, novedadesAbiertas] =
    await Promise.all([
      prisma.visita.count({ where: { ...base, fecha: rango } }),
      prisma.negocio.count({
        where: { ...base, fechaReserva: rango },
      }),
      prisma.negocio.count({
        where: { ...base, estado: { in: ESTADOS_VENTA_VIVA }, fechaVenta: rango },
      }),
      prisma.negocio.count({
        where: { ...base, estado: "caido", fechaCaida: rango },
      }),
      prisma.negocio.aggregate({
        where: { ...base, estado: { in: ESTADOS_VENTA_VIVA }, fechaVenta: rango },
        _sum: { precioLote: true },
      }),
      prisma.novedad.count({
        // Novedad no tiene fuerza (es operativa por proyecto); solo filtra proyecto.
        where: {
          ...(scope.projectIds ? { projectId: { in: scope.projectIds } } : {}),
          estado: { in: ["abierta", "en_proceso"] },
        },
      }),
    ]);

  // Cobrado en el rango (abonos). Filtramos por proyecto del negocio.
  const abonoWhere: Record<string, unknown> = { fecha: rango };
  if (scope.projectIds || scope.fuerza) {
    abonoWhere.negocio = movimientoWhere(scope);
  }
  const cobradoAgg = await prisma.abono.aggregate({
    where: abonoWhere,
    _sum: { monto: true },
  });

  return {
    visitas,
    reservas,
    ventas,
    caidas,
    montoVendido: ventaAgg._sum.precioLote || 0,
    cobrado: cobradoAgg._sum.monto || 0,
    novedadesAbiertas,
    conversion: visitas ? Math.round((ventas / visitas) * 100) : 0,
  };
}

export interface FunnelRow {
  visitas: number;
  reservas: number;
  ventas: number;
  escrituras: number;
}

export async function funnel(
  scope: Scope,
  desde: Date,
  hasta: Date
): Promise<FunnelRow> {
  const base = movimientoWhere(scope);
  const rango = rangeWhere(desde, hasta);
  const [visitas, reservas, ventas, escrituras] = await Promise.all([
    prisma.visita.count({ where: { ...base, fecha: rango } }),
    prisma.negocio.count({ where: { ...base, fechaReserva: rango } }),
    prisma.negocio.count({
      where: { ...base, estado: { in: ESTADOS_VENTA_VIVA }, fechaVenta: rango },
    }),
    prisma.negocio.count({
      where: { ...base, estado: "escriturado", fechaEscritura: rango },
    }),
  ]);
  return { visitas, reservas, ventas, escrituras };
}

/** Ventas y montos agrupados por proyecto. */
export async function ventasPorProyecto(scope: Scope, desde: Date, hasta: Date) {
  const base = movimientoWhere(scope);
  const rango = rangeWhere(desde, hasta);
  const negocios = await prisma.negocio.findMany({
    where: { ...base, estado: { in: ESTADOS_VENTA_VIVA }, fechaVenta: rango },
    select: { projectId: true, precioLote: true, project: { select: { nombre: true, codigo: true } } },
  });
  const map = new Map<string, { nombre: string; codigo: string; ventas: number; monto: number }>();
  for (const n of negocios) {
    const k = n.projectId;
    const row = map.get(k) || {
      nombre: n.project?.nombre || "—",
      codigo: n.project?.codigo || "",
      ventas: 0,
      monto: 0,
    };
    row.ventas += 1;
    row.monto += n.precioLote || 0;
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => b.monto - a.monto);
}

/** Ventas por vendedor. */
export async function ventasPorVendedor(scope: Scope, desde: Date, hasta: Date) {
  const base = movimientoWhere(scope);
  const rango = rangeWhere(desde, hasta);
  const negocios = await prisma.negocio.findMany({
    where: { ...base, estado: { in: ESTADOS_VENTA_VIVA }, fechaVenta: rango },
    select: {
      vendedorId: true,
      precioLote: true,
      fuerza: true,
      vendedor: { select: { nombre: true, fuerza: true } },
    },
  });
  const map = new Map<string, { nombre: string; fuerza: string; ventas: number; monto: number }>();
  for (const n of negocios) {
    const k = n.vendedorId || "sin";
    const row = map.get(k) || {
      nombre: n.vendedor?.nombre || "Sin vendedor",
      fuerza: n.vendedor?.fuerza || n.fuerza,
      ventas: 0,
      monto: 0,
    };
    row.ventas += 1;
    row.monto += n.precioLote || 0;
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => b.monto - a.monto);
}

/** Ventas por fuerza (Interna / UCOES / Destinopropiedades.com). */
export async function ventasPorFuerza(scope: Scope, desde: Date, hasta: Date) {
  const base = movimientoWhere(scope);
  const rango = rangeWhere(desde, hasta);
  const negocios = await prisma.negocio.findMany({
    where: { ...base, estado: { in: ESTADOS_VENTA_VIVA }, fechaVenta: rango },
    select: { fuerza: true, precioLote: true },
  });
  const acc: Record<string, { ventas: number; monto: number }> = {
    interna: { ventas: 0, monto: 0 },
    ucoes: { ventas: 0, monto: 0 },
    destino: { ventas: 0, monto: 0 },
  };
  for (const n of negocios) {
    const k = acc[n.fuerza] ? n.fuerza : "interna";
    acc[k].ventas += 1;
    acc[k].monto += n.precioLote || 0;
  }
  return acc;
}

/** Caídas agrupadas por motivo. */
export async function caidasPorMotivo(scope: Scope, desde: Date, hasta: Date) {
  const base = movimientoWhere(scope);
  const rango = rangeWhere(desde, hasta);
  const negocios = await prisma.negocio.findMany({
    where: { ...base, estado: "caido", fechaCaida: rango },
    select: { motivoCaida: true, precioLote: true },
  });
  const map = new Map<string, { motivo: string; cantidad: number; monto: number }>();
  for (const n of negocios) {
    const k = n.motivoCaida || "otro";
    const row = map.get(k) || { motivo: k, cantidad: 0, monto: 0 };
    row.cantidad += 1;
    row.monto += n.precioLote || 0;
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => b.cantidad - a.cantidad);
}

/** Cartera / cobranza: negocios vivos con saldo. */
export async function cobranza(scope: Scope) {
  const base = movimientoWhere(scope);
  const negocios = await prisma.negocio.findMany({
    where: { ...base, estado: { in: ESTADOS_VENTA_VIVA } },
    select: {
      id: true,
      clienteNombre: true,
      precioLote: true,
      estado: true,
      loteRef: true,
      project: { select: { nombre: true } },
      vendedor: { select: { nombre: true } },
      abonos: { select: { monto: true } },
    },
    orderBy: { fechaVenta: "desc" },
  });
  let carteraTotal = 0;
  let cobradoTotal = 0;
  const rows = negocios.map((n) => {
    const cobrado = n.abonos.reduce((s, a) => s + a.monto, 0);
    const saldo = (n.precioLote || 0) - cobrado;
    carteraTotal += n.precioLote || 0;
    cobradoTotal += cobrado;
    return {
      id: n.id,
      cliente: n.clienteNombre,
      proyecto: n.project?.nombre || "—",
      vendedor: n.vendedor?.nombre || "—",
      lote: n.loteRef,
      estado: n.estado,
      precio: n.precioLote || 0,
      cobrado,
      saldo,
    };
  });
  return { rows, carteraTotal, cobradoTotal, saldoTotal: carteraTotal - cobradoTotal };
}

/** Feed de actividad reciente (bitácora Registro). */
export async function actividadReciente(scope: Scope, limit = 25) {
  const where: Record<string, unknown> = {};
  if (scope.projectIds) where.projectId = { in: scope.projectIds };
  return prisma.registro.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { registradoPor: { select: { displayName: true, username: true } } },
  });
}
