import { prisma } from "@/lib/db";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB por archivo

/**
 * Tipos permitidos por uso. Se valida el CONTENIDO REAL del archivo (firma
 * binaria / "magic bytes"), no la extensión ni el Content-Type que envía el
 * navegador: ambos los controla quien sube y se pueden falsificar.
 *
 * Nunca se aceptan HTML, SVG ni ejecutables: un HTML/SVG con JavaScript
 * servido desde nuestro dominio permitiría robar la sesión de quien lo abra.
 */
export type FileKind = "boleta" | "inventario";

const TIPOS_PERMITIDOS: Record<FileKind, string[]> = {
  // Comprobantes de pago: foto o PDF.
  boleta: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"],
  // Documentos de inventario: PDF, Excel o CSV.
  inventario: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
    "text/csv",
    "image/jpeg",
    "image/png",
  ],
};

/** Detecta el tipo real leyendo la firma binaria del archivo. */
export function detectarTipo(buf: Buffer): string | null {
  const b = buf;
  if (b.length < 4) return null;
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  // PDF: %PDF
  if (b.toString("ascii", 0, 4) === "%PDF") return "application/pdf";
  // ZIP (xlsx/docx son ZIP): PK\x03\x04
  if (b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) {
    // Distingue xlsx buscando marcadores del paquete OOXML.
    const head = b.toString("latin1", 0, Math.min(b.length, 4000));
    if (head.includes("xl/") || head.includes("workbook.xml")) {
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    return "application/zip"; // ZIP que no es xlsx → se rechaza
  }
  // RIFF....WEBP
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  // HEIC/HEIF: ....ftypheic / ftypmif1
  if (b.length > 12 && b.toString("ascii", 4, 8) === "ftyp") {
    const brand = b.toString("ascii", 8, 12);
    if (["heic", "heix", "mif1", "heim"].includes(brand)) return "image/heic";
  }
  // XLS antiguo (OLE2): D0 CF 11 E0
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0)
    return "application/vnd.ms-excel";
  return null; // desconocido
}

/** ¿El contenido parece texto plano seguro (CSV) y no HTML/script? */
function esCsvSeguro(buf: Buffer): boolean {
  const muestra = buf.toString("utf8", 0, Math.min(buf.length, 4096));
  // Rechaza cualquier indicio de HTML/JS (evita XSS almacenado).
  if (/<\s*(script|html|svg|iframe|object|embed|body|img|\?php)\b/i.test(muestra)) return false;
  // Rechaza scripts (shebang) y comandos peligrosos disfrazados de CSV.
  if (/^\s*#!/.test(muestra)) return false;
  if (/\b(rm\s+-rf|curl\s+http|wget\s+http|eval\(|base64\s+-d|powershell)\b/i.test(muestra))
    return false;
  // Sin bytes de control raros (0x00 indica binario).
  if (muestra.includes("\u0000")) return false;
  // Debe parecer tabular: algún separador en las primeras líneas.
  const primeras = muestra.split(/\r?\n/).slice(0, 5).join("\n");
  if (!/[,;\t]/.test(primeras)) return false;
  return true;
}

/**
 * Guarda un archivo subido, validando tamaño y tipo real. Devuelve su id.
 * Lanza un Error con mensaje legible si el archivo no es aceptable.
 */
export async function storeFile(
  file: File | null,
  kind: FileKind,
  subidoPorId?: string
): Promise<{ id: string; nombre: string; size: number } | null> {
  if (!file || typeof file.arrayBuffer !== "function") return null;
  if (!file.size) return null;
  if (file.size > MAX_BYTES) {
    throw new Error("El archivo supera el límite de 8 MB.");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const permitidos = TIPOS_PERMITIDOS[kind] || [];
  const nombreOriginal = String(file.name || "archivo");

  let tipoReal = detectarTipo(buf);
  // CSV no tiene firma binaria: se acepta solo si el contenido es texto seguro
  // y el nombre termina en .csv.
  if (!tipoReal && /\.csv$/i.test(nombreOriginal) && esCsvSeguro(buf)) {
    tipoReal = "text/csv";
  }

  if (!tipoReal || !permitidos.includes(tipoReal)) {
    throw new Error(
      kind === "boleta"
        ? "Archivo no válido. Adjunta una foto (JPG/PNG) o un PDF de la boleta."
        : "Archivo no válido. Usa PDF, Excel (.xlsx/.xls) o CSV."
    );
  }

  // Nombre saneado: sin rutas ni caracteres que rompan cabeceras.
  const nombre = nombreOriginal
    .replace(/[\r\n"\\]/g, "")
    .replace(/[/\\]/g, "_")
    .slice(0, 120) || "archivo";

  const stored = await prisma.storedFile.create({
    data: {
      nombre,
      mimeType: tipoReal, // el tipo VERIFICADO, no el que envió el navegador
      kind,
      bytes: buf,
      size: buf.length,
      subidoPorId: subidoPorId || null,
    },
  });
  return { id: stored.id, nombre: stored.nombre, size: stored.size };
}
