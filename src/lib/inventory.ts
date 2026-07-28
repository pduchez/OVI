import { leerLibro, escribirXlsx, leerCsv } from "@/lib/xlsx";

export interface LoteRow {
  numero: string;
  area: number;
  precio: number;
  estado: string;
  notas: string;
}

export interface ResultadoLectura {
  filas: LoteRow[];
  hoja: string; // nombre de la hoja de la que se tomaron los lotes
  hojasIgnoradas: string[];
}

/** Normaliza encabezados: minúsculas, sin acentos ni signos. */
function norm(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const ESTADOS_VALIDOS = ["disponible", "reservado", "vendido", "bloqueado"];

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[^0-9.,-]/g, "");
  // Formato "1,234.56" o "1.234,56": se queda con el último separador decimal.
  const limpio =
    s.lastIndexOf(",") > s.lastIndexOf(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

/**
 * Empareja el estado comercial que traiga el archivo con los estados de OVI.
 * Lo que no se reconoce (p. ej. "No especificado") se asume disponible.
 */
function mapEstado(v: string): string {
  const e = norm(v);
  if (!e) return "disponible";
  if (ESTADOS_VALIDOS.includes(e)) return e;
  if (e.includes("vendid")) return "vendido";
  if (e.includes("reserv") || e.includes("apartad")) return "reservado";
  if (e.includes("bloque") || e.includes("noaplica")) return "bloqueado";
  if (e.includes("libre") || e.includes("disponible")) return "disponible";
  return "disponible";
}

/** Índice de la columna cuyo encabezado cumple el predicado (primera coincidencia). */
function idx(encabezados: string[], pred: (k: string) => boolean): number {
  return encabezados.findIndex(pred);
}

/**
 * Convierte una matriz (con fila de encabezados) en filas de lote.
 *
 * Reconoce los nombres de columna más habituales en los archivos reales:
 *  - Número: "numero" / "lote"; si además hay "polígono", se combina → "A-12".
 *  - Área: prefiere m² sobre v² (vara²).
 *  - Precio: prefiere el precio de CONTADO sobre el precio por unidad de área.
 *  - Estado: "estado comercial" / "estado".
 *  - Notas: "uso" / "categoría" / "notas" / "observaciones".
 */
function filasALotes(matriz: string[][]): LoteRow[] {
  if (!matriz.length) return [];
  // Busca la fila de encabezados en las primeras filas (a veces hay título).
  let hIdx = -1;
  let enc: string[] = [];
  for (let i = 0; i < Math.min(matriz.length, 8); i++) {
    const cand = (matriz[i] || []).map(norm);
    const tieneLote = cand.some((k) => k === "lote" || k.startsWith("numero") || k === "nolote");
    const tienePrecio = cand.some((k) => k.startsWith("precio") || k === "valor" || k === "monto");
    const tieneArea = cand.some((k) => k.startsWith("area"));
    if (tieneLote && (tienePrecio || tieneArea)) {
      hIdx = i;
      enc = cand;
      break;
    }
  }
  if (hIdx < 0) return [];

  const iPol = idx(enc, (k) => k.startsWith("poligono") || k === "manzana" || k === "bloque");
  const iNum = idx(enc, (k) => k === "lote" || k === "nolote" || k.startsWith("numerodelote") || k.startsWith("numero"));
  // Área: m² primero; si no, cualquier área.
  let iArea = idx(enc, (k) => k === "aream2" || k === "aream" || k === "m2" || k === "aream²");
  if (iArea < 0) iArea = idx(enc, (k) => k.startsWith("area") && !k.includes("v2") && !k.includes("vara"));
  if (iArea < 0) iArea = idx(enc, (k) => k.startsWith("area"));
  // Precio: contado primero; nunca el precio por vara/m² (unitario).
  let iPrecio = idx(enc, (k) => k.includes("contado"));
  if (iPrecio < 0)
    iPrecio = idx(
      enc,
      (k) =>
        (k.startsWith("precio") || k === "valor" || k === "monto") &&
        !k.includes("v2") && !k.includes("vara") && !k.includes("m2") && !k.includes("unitario")
    );
  if (iPrecio < 0) iPrecio = idx(enc, (k) => k.startsWith("precio"));
  const iEstado = idx(enc, (k) => k.startsWith("estado"));
  const iUso = idx(enc, (k) => k.startsWith("uso") || k.startsWith("categoria"));
  const iNotas = idx(enc, (k) => k.startsWith("nota") || k.startsWith("observ"));

  if (iNum < 0) return [];

  const vistos = new Set<string>();
  const out: LoteRow[] = [];
  for (const fila of matriz.slice(hIdx + 1)) {
    const bruto = String(fila[iNum] ?? "").trim();
    if (!bruto) continue;
    const pol = iPol >= 0 ? String(fila[iPol] ?? "").trim() : "";
    // Número final: "A-12" cuando hay polígono; si no, el valor tal cual.
    let numero = (pol ? `${pol}-${bruto}` : bruto).slice(0, 60);
    if (!numero || /^total$/i.test(numero)) continue; // ignora filas de totales
    // Evita duplicados dentro del mismo archivo.
    if (vistos.has(numero.toLowerCase())) continue;
    vistos.add(numero.toLowerCase());

    const notasPartes: string[] = [];
    if (iUso >= 0 && fila[iUso]) notasPartes.push(String(fila[iUso]).trim());
    if (iNotas >= 0 && fila[iNotas]) notasPartes.push(String(fila[iNotas]).trim());

    out.push({
      numero,
      area: iArea >= 0 ? toNum(fila[iArea]) : 0,
      precio: iPrecio >= 0 ? toNum(fila[iPrecio]) : 0,
      estado: mapEstado(iEstado >= 0 ? String(fila[iEstado] ?? "") : ""),
      notas: notasPartes.join(" · ").slice(0, 300),
    });
  }
  return out;
}

/**
 * Lee un archivo Excel (.xlsx) o CSV y devuelve las filas de lote.
 * Si el Excel tiene varias hojas, elige AUTOMÁTICAMENTE la que contiene los
 * lotes (la que produce más registros válidos) e informa cuáles se ignoraron.
 */
export function parseInventoryDetallado(buf: Buffer, nombre = ""): ResultadoLectura {
  if (/\.csv$/i.test(nombre)) {
    return { filas: filasALotes(leerCsv(buf.toString("utf8"))), hoja: "CSV", hojasIgnoradas: [] };
  }
  const hojas = leerLibro(buf);
  let mejor: ResultadoLectura = { filas: [], hoja: "", hojasIgnoradas: [] };
  const otras: string[] = [];
  for (const h of hojas) {
    const filas = filasALotes(h.filas);
    if (filas.length > mejor.filas.length) {
      if (mejor.hoja) otras.push(mejor.hoja);
      mejor = { filas, hoja: h.nombre, hojasIgnoradas: [] };
    } else {
      otras.push(h.nombre);
    }
  }
  mejor.hojasIgnoradas = otras;
  return mejor;
}

/** Compatibilidad: solo las filas. */
export function parseInventory(buf: Buffer, nombre = ""): LoteRow[] {
  return parseInventoryDetallado(buf, nombre).filas;
}

/** Genera un archivo Excel (buffer) con los lotes dados. */
export function buildInventoryXlsx(
  lotes: { numero: string; area: number; precio: number; estado: string; notas: string }[]
): Buffer {
  const filas: (string | number)[][] = [["numero", "area", "precio", "estado", "notas"]];
  for (const l of lotes) {
    filas.push([l.numero, l.area, l.precio, l.estado, l.notas]);
  }
  if (lotes.length === 0) filas.push(["", 0, 0, "disponible", ""]);
  return escribirXlsx(filas);
}
