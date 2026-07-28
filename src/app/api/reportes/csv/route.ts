import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import {
  ventasPorProyecto,
  ventasPorVendedor,
  caidasPorMotivo,
  cobranza,
} from "@/lib/analytics";
import { rangoPreset } from "@/lib/format";
import { MOTIVOS_CAIDA, ESTADO_NEGOCIO_LABEL, labelOf } from "@/lib/constants";

export const dynamic = "force-dynamic";

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });
  const scope = await getScope(user);

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo") || "por_proyecto";
  const preset = url.searchParams.get("r") || "mes";
  const { desde, hasta } = rangoPreset(preset);

  let rows: (string | number)[][] = [];
  let nombre = "reporte";

  if (tipo === "por_proyecto") {
    nombre = "ventas_por_proyecto";
    const data = await ventasPorProyecto(scope, desde, hasta);
    rows = [["Codigo", "Proyecto", "Ventas", "Monto"]];
    data.forEach((d) => rows.push([d.codigo, d.nombre, d.ventas, d.monto]));
  } else if (tipo === "por_vendedor") {
    nombre = "ventas_por_vendedor";
    const data = await ventasPorVendedor(scope, desde, hasta);
    rows = [["Vendedor", "Fuerza", "Ventas", "Monto"]];
    data.forEach((d) =>
      rows.push([d.nombre, d.fuerza === "ucoes" ? "UCOES" : "Interna", d.ventas, d.monto])
    );
  } else if (tipo === "caidas") {
    nombre = "analisis_caidas";
    const data = await caidasPorMotivo(scope, desde, hasta);
    rows = [["Motivo", "Cantidad", "Monto"]];
    data.forEach((d) =>
      rows.push([labelOf(MOTIVOS_CAIDA, d.motivo), d.cantidad, d.monto])
    );
  } else if (tipo === "cobranza") {
    nombre = "cartera_cobranza";
    const { rows: data } = await cobranza(scope);
    rows = [["Cliente", "Proyecto", "Vendedor", "Estado", "Precio", "Cobrado", "Saldo"]];
    data.forEach((d) =>
      rows.push([
        d.cliente,
        d.proyecto,
        d.vendedor,
        ESTADO_NEGOCIO_LABEL[d.estado] || d.estado,
        d.precio,
        d.cobrado,
        d.saldo,
      ])
    );
  } else {
    return new Response("Reporte no exportable", { status: 400 });
  }

  const csv = "﻿" + toCsv(rows); // BOM para acentos en Excel
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}_${preset}.csv"`,
    },
  });
}
