import { leerLibro, escribirXlsx, leerCsv } from "@/lib/xlsx";
import { leerPdf } from "@/lib/pdf";

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
  /** Qué se encontró en cada hoja. Sirve para explicar por qué falló. */
  diagnostico: { hoja: string; columnas: string[]; lotes: number }[];
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
function encabezadosDe(matriz: string[][]): string[] {
  for (let i = 0; i < Math.min(matriz.length, 8); i++) {
    const fila = (matriz[i] || []).filter((c) => String(c || "").trim());
    if (fila.length >= 2) return fila.map((c) => String(c).trim()).slice(0, 14);
  }
  return [];
}

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
 * Interpreta una LISTA DE PRECIOS en PDF (con capa de texto).
 *
 * Formato típico del Grupo Chacón: tablas por polígono, con un encabezado
 * "POLIGONO X" y luego filas "lote | m² | v² | precio v² | precio contado |
 * prima | a financiar". Se toma el número de lote, el área en m² y el precio
 * de contado; las filas de TOTAL se descartan.
 */
function lineasALotes(lineas: string[]): LoteRow[] {
  const out: LoteRow[] = [];
  const vistos = new Set<string>();
  let poligono = "";

  for (const cruda of lineas) {
    const linea = cruda.replace(/\$/g, " ").replace(/\s+/g, " ").trim();
    if (!linea) continue;

    // ¿Cambia el polígono/manzana?
    const pol = linea.match(/\b(?:pol[ií]gono|poligono|manzana|bloque)\s*[:\-]?\s*([A-Za-z0-9]{1,4})\b/i);
    if (pol) {
      poligono = pol[1].toUpperCase();
      continue;
    }
    if (/^total\b/i.test(linea)) continue; // fila de totales

    // Números de la línea (admite 1,234.56).
    const nums = (linea.match(/\d[\d,]*\.?\d*/g) || []).map((n) => parseFloat(n.replace(/,/g, "")));
    if (nums.length < 3) continue;

    // El primer número es el lote (entero y pequeño); el resto, medidas y precios.
    const loteNum = nums[0];
    if (!Number.isInteger(loteNum) || loteNum <= 0 || loteNum > 9999) continue;
    const resto = nums.slice(1).filter((n) => n > 0);
    if (resto.length < 2) continue;

    // Área: el primer valor razonable de superficie (m²).
    const area = resto[0] >= 20 && resto[0] <= 100000 ? resto[0] : 0;
    // Precio de contado: el mayor valor "de venta" descartando el precio
    // unitario por v² (suele ser el menor) y el "a financiar" (menor que el
    // contado). Se toma el máximo, que en estas listas es el precio contado
    // salvo que exista "a financiar"; por eso se usa el segundo mayor cuando
    // hay 4+ importes (v², contado, prima, a financiar).
    const importes = resto.slice(1).filter((n) => n >= 100);
    let precio = 0;
    if (importes.length >= 3) {
      const orden = [...importes].sort((a, b) => b - a);
      precio = orden[0]; // contado suele ser el mayor
    } else if (importes.length) {
      precio = Math.max(...importes);
    }
    if (!precio) continue;

    const numero = (poligono ? `${poligono}-${loteNum}` : String(loteNum)).slice(0, 60);
    if (vistos.has(numero.toLowerCase())) continue;
    vistos.add(numero.toLowerCase());
    out.push({ numero, area, precio, estado: "disponible", notas: "" });
  }
  return out;
}

/**
 * Lee un archivo Excel (.xlsx), CSV o PDF y devuelve las filas de lote.
 * Si el Excel tiene varias hojas, elige AUTOMÁTICAMENTE la que contiene los
 * lotes (la que produce más registros válidos) e informa cuáles se ignoraron.
 */
export function parseInventoryDetallado(buf: Buffer, nombre = ""): ResultadoLectura {
  if (/\.pdf$/i.test(nombre) || buf.subarray(0, 4).toString("ascii") === "%PDF") {
    const pdf = leerPdf(buf);
    if (pdf.esEscaneado) {
      throw new Error(
        "Este PDF es una imagen escaneada (no tiene texto que leer), por lo que no se " +
          "pueden extraer los lotes de forma confiable. Pide la lista en Excel o CSV: " +
          "un precio mal leído de una foto se convertiría en una venta con precio equivocado."
      );
    }
    const lotesPdf = lineasALotes(pdf.lineas);
    return {
      filas: lotesPdf,
      hoja: `PDF (${pdf.paginas} pág.)`,
      hojasIgnoradas: [],
      diagnostico: [
        { hoja: "PDF", columnas: pdf.lineas.slice(0, 3), lotes: lotesPdf.length },
      ],
    };
  }
  if (/\.csv$/i.test(nombre)) {
    const filasCsv = leerCsv(buf.toString("utf8"));
    const lotesCsv = filasALotes(filasCsv);
    return {
      filas: lotesCsv,
      hoja: "CSV",
      hojasIgnoradas: [],
      diagnostico: [{ hoja: "CSV", columnas: encabezadosDe(filasCsv), lotes: lotesCsv.length }],
    };
  }
  const hojas = leerLibro(buf);
  let mejor: ResultadoLectura = { filas: [], hoja: "", hojasIgnoradas: [], diagnostico: [] };
  const otras: string[] = [];
  const diag: { hoja: string; columnas: string[]; lotes: number }[] = [];
  for (const h of hojas) {
    const filas = filasALotes(h.filas);
    diag.push({ hoja: h.nombre, columnas: encabezadosDe(h.filas), lotes: filas.length });
    if (filas.length > mejor.filas.length) {
      if (mejor.hoja) otras.push(mejor.hoja);
      mejor = { filas, hoja: h.nombre, hojasIgnoradas: [], diagnostico: [] };
    } else {
      otras.push(h.nombre);
    }
  }
  mejor.hojasIgnoradas = otras;
  mejor.diagnostico = diag;
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
