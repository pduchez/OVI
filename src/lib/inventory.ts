import * as XLSX from "xlsx";

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

/**
 * Lee un archivo Excel (.xlsx/.xls) o CSV y devuelve las filas de lote.
 * Encabezados aceptados (flexibles): numero/lote, area/m2/vara, precio/valor,
 * estado, notas/observaciones.
 */
export function parseInventory(buf: Buffer): LoteRow[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
  });

  const out: LoteRow[] = [];
  for (const raw of rows) {
    // Mapear claves por encabezado normalizado.
    const m: Record<string, unknown> = {};
    for (const k of Object.keys(raw)) m[norm(k)] = raw[k];
    const keys = Object.keys(m);
    // Busca el valor de la primera clave que cumpla el predicado.
    const pick = (pred: (k: string) => boolean) => {
      const k = keys.find(pred);
      return k ? m[k] : undefined;
    };

    const numero = String(
      pick((k) => k === "numero" || k === "lote" || k === "nolote" || k.startsWith("numero")) ?? ""
    ).trim();
    if (!numero) continue;

    const area = toNum(
      pick((k) => k.startsWith("area") || k === "m2" || k.startsWith("vara"))
    );
    const precio = toNum(
      pick((k) => k.startsWith("precio") || k === "valor" || k === "monto")
    );
    let estado = norm(String(pick((k) => k.startsWith("estado")) ?? "disponible"));
    if (!ESTADOS_VALIDOS.includes(estado)) estado = "disponible";
    const notas = String(
      pick((k) => k.startsWith("nota") || k.startsWith("observ")) ?? ""
    ).trim();

    out.push({ numero, area, precio, estado, notas });
  }
  return out;
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v || "0").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

/** Genera un archivo Excel (buffer) con los lotes dados. */
export function buildInventoryXlsx(
  lotes: { numero: string; area: number; precio: number; estado: string; notas: string }[]
): Buffer {
  const data = lotes.map((l) => ({
    numero: l.numero,
    area: l.area,
    precio: l.precio,
    estado: l.estado,
    notas: l.notas,
  }));
  const ws = XLSX.utils.json_to_sheet(
    data.length ? data : [{ numero: "", area: 0, precio: 0, estado: "disponible", notas: "" }]
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
