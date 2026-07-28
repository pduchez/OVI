/**
 * Lector mínimo de texto de PDF — SIN dependencias externas.
 *
 * Sirve para importar listas de precios que vienen en PDF "digital" (los que
 * se generan desde Excel/Word y llevan una capa de texto). Reconstruye las
 * líneas usando la posición de cada fragmento, para poder separar columnas.
 *
 * NO hace OCR: un PDF escaneado (una foto del papel) no tiene texto que leer.
 * Para ese caso se detecta la situación y se avisa con claridad, en vez de
 * inventar números —un precio mal leído se convertiría en una venta errónea—.
 */
import { inflateSync } from "zlib";

const MAX_STREAM = 20 * 1024 * 1024; // límite anti archivos maliciosos

export interface PdfTexto {
  /** Líneas de texto reconstruidas, en orden de lectura. */
  lineas: string[];
  /** true si el PDF no tiene capa de texto (es un escaneo/foto). */
  esEscaneado: boolean;
  paginas: number;
}

/** Descomprime los flujos de contenido del PDF. */
function flujos(buf: Buffer): string[] {
  const out: string[] = [];
  const s = buf.toString("latin1");
  const re = /stream\r?\n?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const ini = m.index + m[0].length;
    const fin = s.indexOf("endstream", ini);
    if (fin < 0) continue;
    const crudo = buf.subarray(ini, fin);
    if (crudo.length > MAX_STREAM) continue;
    // El encabezado del objeto está justo antes del "stream".
    const cabecera = s.slice(Math.max(0, m.index - 400), m.index);
    if (!/\/FlateDecode/.test(cabecera)) continue;
    // Los flujos de imagen no contienen texto: se saltan.
    if (/\/Subtype\s*\/Image/.test(cabecera)) continue;
    try {
      out.push(inflateSync(crudo, { maxOutputLength: MAX_STREAM }).toString("latin1"));
    } catch {
      // Flujo ilegible: se ignora.
    }
  }
  return out;
}

/** Decodifica una cadena literal de PDF: (texto con \( escapes ). */
function decodificarLiteral(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") {
      const n = s[++i];
      if (n === "n") out += "\n";
      else if (n === "r") out += "";
      else if (n === "t") out += "\t";
      else if (n >= "0" && n <= "7") {
        let oct = n;
        while (oct.length < 3 && s[i + 1] >= "0" && s[i + 1] <= "7") oct += s[++i];
        out += String.fromCharCode(parseInt(oct, 8));
      } else out += n ?? "";
    } else out += c;
  }
  return out;
}

/** Decodifica una cadena hexadecimal de PDF: <48656C6C6F>. */
function decodificarHex(s: string): string {
  const limpio = s.replace(/[^0-9A-Fa-f]/g, "");
  let out = "";
  // Si parece UTF-16BE (muy común), se lee de dos en dos bytes.
  const esUtf16 = limpio.length >= 4 && limpio.slice(0, 4).toUpperCase() === "FEFF";
  const paso = esUtf16 ? 4 : 2;
  for (let i = esUtf16 ? 4 : 0; i + paso <= limpio.length; i += paso) {
    out += String.fromCharCode(parseInt(limpio.slice(i, i + paso), 16));
  }
  return out;
}

/**
 * Extrae el texto de un PDF reconstruyendo las líneas por su posición
 * vertical, para que una fila de tabla quede en una sola línea.
 */
export function leerPdf(buf: Buffer): PdfTexto {
  const paginas = (buf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length || 1;
  const fragmentos: { y: number; x: number; texto: string }[] = [];

  for (const contenido of flujos(buf)) {
    let x = 0;
    let y = 0;
    // Recorre los operadores de texto del flujo.
    const re =
      /(?:BT)|(?:ET)|(?:([-\d.]+)\s+([-\d.]+)\s+Td)|(?:([-\d.]+)\s+([-\d.]+)\s+TD)|(?:[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s+Tm)|(?:T\*)|(?:\((?:[^()\\]|\\.)*\)\s*Tj)|(?:<[0-9A-Fa-f\s]*>\s*Tj)|(?:\[(?:[^\][]|\\.)*\]\s*TJ)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(contenido))) {
      const t = m[0];
      if (m[1] !== undefined) {
        x += parseFloat(m[1]);
        y += parseFloat(m[2]);
      } else if (m[3] !== undefined) {
        x += parseFloat(m[3]);
        y += parseFloat(m[4]);
      } else if (m[5] !== undefined) {
        x = parseFloat(m[5]);
        y = parseFloat(m[6]);
      } else if (t === "T*") {
        y -= 12;
      } else if (t.endsWith("Tj")) {
        const lit = t.match(/\(((?:[^()\\]|\\.)*)\)/);
        const hex = t.match(/<([0-9A-Fa-f\s]*)>/);
        const texto = lit ? decodificarLiteral(lit[1]) : hex ? decodificarHex(hex[1]) : "";
        if (texto.trim()) fragmentos.push({ y, x, texto });
      } else if (t.endsWith("TJ")) {
        // Arreglo: mezcla cadenas y desplazamientos numéricos.
        const partes = t.match(/\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]*>/g) || [];
        const texto = partes
          .map((p) =>
            p.startsWith("(") ? decodificarLiteral(p.slice(1, -1)) : decodificarHex(p.slice(1, -1))
          )
          .join("");
        if (texto.trim()) fragmentos.push({ y, x, texto });
      }
    }
  }

  // Agrupa los fragmentos por línea (misma altura, con tolerancia).
  const lineas: string[] = [];
  if (fragmentos.length) {
    const orden = [...fragmentos].sort((a, b) => (b.y - a.y) || (a.x - b.x));
    let actual: typeof orden = [];
    let yRef = orden[0].y;
    for (const f of orden) {
      if (Math.abs(f.y - yRef) > 3) {
        if (actual.length) {
          lineas.push(
            actual.sort((a, b) => a.x - b.x).map((p) => p.texto).join(" ").replace(/\s+/g, " ").trim()
          );
        }
        actual = [];
        yRef = f.y;
      }
      actual.push(f);
    }
    if (actual.length) {
      lineas.push(
        actual.sort((a, b) => a.x - b.x).map((p) => p.texto).join(" ").replace(/\s+/g, " ").trim()
      );
    }
  }

  const utiles = lineas.filter((l) => l.length > 1);
  return { lineas: utiles, esEscaneado: utiles.length < 3, paginas };
}
