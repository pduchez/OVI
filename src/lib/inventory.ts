import { leerXlsx, escribirXlsx, leerCsv } from "@/lib/xlsx";

export interface LoteRow {
  numero: string;
  area: number;
  precio: number;
  estado: string;
  notas: string;
}

/** Normaliza encabezados: minúsculas, sin acentos ni espacios. */
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
  const n = parseFloat(String(v ?? "0").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

/**
 * Convierte una matriz (primera fila = encabezados) en filas de lote.
 * Encabezados aceptados de forma flexible: numero/lote, area/m2/vara,
 * precio/valor/monto, estado, notas/observaciones.
 */
function filasALotes(matriz: string[][]): LoteRow[] {
  if (!matriz.length) return [];
  const encabezados = (matriz[0] || []).map(norm);
  const idxDe = (pred: (k: string) => boolean) => encabezados.findIndex(pred);

  const iNum = idxDe((k) => k === "numero" || k === "lote" || k === "nolote" || k.startsWith("numero"));
  const iArea = idxDe((k) => k.startsWith("area") || k === "m2" || k.startsWith("vara"));
  const iPrecio = idxDe((k) => k.startsWith("precio") || k === "valor" || k === "monto");
  const iEstado = idxDe((k) => k.startsWith("estado"));
  const iNotas = idxDe((k) => k.startsWith("nota") || k.startsWith("observ"));

  if (iNum < 0) return []; // sin columna de número no se puede importar

  const out: LoteRow[] = [];
  for (const fila of matriz.slice(1)) {
    const numero = String(fila[iNum] ?? "").trim();
    if (!numero) continue;
    let estado = norm(String(iEstado >= 0 ? fila[iEstado] ?? "" : ""));
    if (!ESTADOS_VALIDOS.includes(estado)) estado = "disponible";
    out.push({
      numero: numero.slice(0, 60),
      area: iArea >= 0 ? toNum(fila[iArea]) : 0,
      precio: iPrecio >= 0 ? toNum(fila[iPrecio]) : 0,
      estado,
      notas: String(iNotas >= 0 ? fila[iNotas] ?? "" : "").trim().slice(0, 300),
    });
  }
  return out;
}

/** Lee un archivo Excel (.xlsx) o CSV y devuelve las filas de lote. */
export function parseInventory(buf: Buffer, nombre = ""): LoteRow[] {
  if (/\.csv$/i.test(nombre)) {
    return filasALotes(leerCsv(buf.toString("utf8")));
  }
  return filasALotes(leerXlsx(buf));
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
