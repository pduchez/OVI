/**
 * Interpretación de las hojas de inventario reales.
 *
 * Cada proyecto y cada vendedora arma su archivo a su manera. Lo que llega no
 * es una tabla limpia: son varias tablas de polígono puestas una al lado de la
 * otra en la misma hoja, con el título del polígono en una celda combinada
 * arriba, y —lo más importante— con el estado del lote NO escrito sino
 * PINTADO: rojo vendido, amarillo reserva administrativa, sin pintar
 * disponible, con su leyenda en una esquina de la hoja.
 *
 * Este módulo no adivina: lee lo que el archivo declara de sí mismo.
 *
 *  1. Busca la LEYENDA en la propia hoja: una celda pintada junto a una palabra
 *     como «VENDIDO». De ahí sale la tabla de equivalencias color → estado.
 *     Si el archivo la trae, manda ella; nunca se supone que rojo es vendido.
 *  2. Encuentra CADA BLOQUE de lotes por separado, con sus propias columnas, y
 *     le pone al frente el polígono que lo titula.
 *  3. Informa TODO lo que entendió y lo que no. Un color pintado que la leyenda
 *     no explica no se interpreta a la ligera: se cuenta y se avisa.
 */

export interface LoteLeido {
  numero: string;
  area: number;
  precio: number;
  estado: string;
  notas: string;
  /** De dónde salió el estado, para poder explicárselo a la persona. */
  origenEstado: "columna" | "color" | "sin marca";
}

export interface Bloque {
  poligono: string;
  filaEncabezado: number;
  colLote: number;
  colArea: number;
  colPrecio: number;
  colEstado: number;
  desde: number;
  hasta: number;
  lotes: number;
}

export interface LecturaHoja {
  lotes: LoteLeido[];
  bloques: Bloque[];
  /** color → estado, tal como lo declara la leyenda del archivo. */
  leyenda: { color: string; etiqueta: string; estado: string }[];
  /** Rellenos usados en los datos que la leyenda no explica. */
  coloresSinExplicar: { color: string; lotes: number }[];
}

// --- Utilidades ----------------------------------------------------------

/** Minúsculas, sin acentos ni signos. */
export function norm(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function aNumero(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[^0-9.,-]/g, "");
  const limpio =
    s.lastIndexOf(",") > s.lastIndexOf(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

/**
 * Traduce a los cuatro estados de OVI cualquier forma de decirlo. Se mantiene
 * generosa a propósito: cada proyecto escribe lo suyo («APARTADO», «RESERVA
 * ADMINISTRATIVA», «NO DISPONIBLE», «SEPARADO»).
 *
 * Devuelve null cuando el texto NO habla de un estado, para poder distinguir
 * «no lo entendí» de «dice disponible». Confundir esas dos cosas es lo que
 * haría que un lote vendido apareciera libre.
 */
export function aEstado(texto: string): string | null {
  const e = norm(texto);
  if (!e) return null;
  if (["disponible", "reservado", "vendido", "bloqueado"].includes(e)) return e;
  if (e.includes("vendid") || e.includes("venta") || e.includes("escriturad")) return "vendido";
  if (
    e.includes("reserv") ||
    e.includes("apartad") ||
    e.includes("separad") ||
    e.includes("abonad") ||
    e.includes("promesa")
  ) {
    return "reservado";
  }
  if (
    e.includes("bloque") ||
    e.includes("noaplica") ||
    e.includes("nodisponible") ||
    e.includes("areaverde") ||
    e.includes("calle") ||
    e.includes("zonaverde")
  ) {
    return "bloqueado";
  }
  if (e.includes("disponible") || e.includes("libre") || e.includes("venta")) return "disponible";
  return null;
}

const ENC_LOTE = (k: string) =>
  k === "lote" || k === "lotes" || k === "nolote" || k === "numlote" ||
  k === "numero" || k === "numerodelote" || k === "no" || k === "n";

const ENC_AREA = (k: string) => k.startsWith("area") || k.startsWith("medidas") || k === "m2" || k === "v2";
const ENC_PRECIO = (k: string) =>
  k.startsWith("precio") || k === "valor" || k === "monto" || k === "total";
const ENC_ESTADO = (k: string) =>
  k.startsWith("estado") || k === "situacion" || k === "condicion" || k === "status";

/** ¿La medida está en varas² en vez de metros²? OVI guarda m². */
function esVaras(encabezado: string): boolean {
  const k = norm(encabezado);
  return k.includes("v2") || k.includes("vara") || k.includes("vrs");
}

// --- 1. La leyenda que trae el propio archivo ----------------------------

/**
 * Busca en toda la hoja parejas «recuadro pintado» + «palabra de estado».
 *
 * En los archivos del Grupo la leyenda va a la derecha: una celda pintada y, a
 * su lado, el texto DISPONIBLE / VENDIDO / RESERVA ADMINISTRATIVA. Se acepta
 * el recuadro a cualquiera de los dos lados y hasta a tres celdas de distancia,
 * porque cada quien la arma como puede.
 */
export function leerLeyenda(
  filas: string[][],
  colores: string[][]
): { color: string; etiqueta: string; estado: string }[] {
  const encontrado = new Map<string, { etiqueta: string; estado: string }>();

  for (let f = 0; f < filas.length; f++) {
    const fila = filas[f] || [];
    for (let c = 0; c < fila.length; c++) {
      const texto = String(fila[c] || "").trim();
      if (!texto || texto.length > 40) continue;
      const estado = aEstado(texto);
      if (!estado) continue;

      // El recuadro de muestra: una celda PINTADA y SIN TEXTO, cerca.
      for (const dc of [-1, -2, -3, 1, 2, 3]) {
        const cc = c + dc;
        if (cc < 0) continue;
        const color = (colores[f] || [])[cc] || "";
        const textoVecino = String((filas[f] || [])[cc] || "").trim();
        if (!color || textoVecino) continue;
        if (!encontrado.has(color)) encontrado.set(color, { etiqueta: texto, estado });
        break;
      }
    }
  }

  return [...encontrado].map(([color, v]) => ({ color, ...v }));
}

// --- 2. Los bloques de lotes ---------------------------------------------

/**
 * Encuentra cada tabla de lotes de la hoja. Una hoja puede traer varias, una
 * al lado de la otra: en Nuevo San Vicente vienen POLIGONO 2, 3 y 7 en la misma
 * fila de encabezados. Tomar solo la primera —como se hacía antes— dejaba fuera
 * dos tercios del proyecto.
 */
export function detectarBloques(filas: string[][]): Bloque[] {
  const bloques: Bloque[] = [];
  const tope = Math.min(filas.length, 40); // los encabezados están arriba

  for (let f = 0; f < tope; f++) {
    const fila = (filas[f] || []).map(norm);
    // Todas las columnas de esta fila que dicen "LOTE".
    const inicios: number[] = [];
    for (let c = 0; c < fila.length; c++) if (fila[c] && ENC_LOTE(fila[c])) inicios.push(c);
    if (!inicios.length) continue;

    for (let i = 0; i < inicios.length; i++) {
      const desde = inicios[i];
      // El bloque llega hasta donde empieza el siguiente.
      const hasta = i + 1 < inicios.length ? inicios[i + 1] : fila.length;

      // Dentro del bloque: área (prefiere m² sobre v²), precio y estado.
      let colArea = -1;
      let colAreaVaras = -1;
      let colPrecio = -1;
      let colEstado = -1;
      for (let c = desde + 1; c < hasta; c++) {
        const k = fila[c];
        if (!k) continue;
        if (ENC_AREA(k)) {
          if (esVaras((filas[f] || [])[c])) {
            if (colAreaVaras < 0) colAreaVaras = c;
          } else if (colArea < 0) {
            colArea = c;
          }
        } else if (ENC_PRECIO(k) && colPrecio < 0) {
          colPrecio = c;
        } else if (ENC_ESTADO(k) && colEstado < 0) {
          colEstado = c;
        }
      }
      // Si solo hay varas², se usa esa: mejor un área en varas anotada que
      // ninguna. La conversión no se inventa aquí.
      if (colArea < 0) colArea = colAreaVaras;

      // Sin precio ni área no es una tabla de lotes, es otra cosa.
      if (colPrecio < 0 && colArea < 0) continue;

      bloques.push({
        poligono: tituloDelBloque(filas, f, desde, hasta),
        filaEncabezado: f,
        colLote: desde,
        colArea,
        colPrecio,
        colEstado,
        desde,
        hasta,
        lotes: 0,
      });
    }
    if (bloques.length) break; // una sola fila de encabezados por hoja
  }
  return bloques;
}

/**
 * El polígono que titula un bloque: se busca hacia arriba, dentro de las
 * columnas del bloque. Viene en una celda combinada, así que su valor está en
 * la celda de más a la izquierda del bloque.
 */
function tituloDelBloque(filas: string[][], filaEnc: number, desde: number, hasta: number): string {
  for (let f = filaEnc - 1; f >= 0 && f >= filaEnc - 8; f--) {
    for (let c = desde; c < hasta; c++) {
      const txt = String((filas[f] || [])[c] || "").trim();
      if (!txt) continue;
      const m = txt.match(/\b(?:pol[ií]gono|poligono|manzana|mzn|bloque|sector|etapa)\s*[:\-]?\s*([A-Za-z0-9]{1,6})\b/i);
      if (m) return m[1].toUpperCase();
    }
  }
  return "";
}

// --- 3. Lectura completa de una hoja -------------------------------------

export function leerHojaDeInventario(filas: string[][], colores: string[][]): LecturaHoja {
  const leyenda = leerLeyenda(filas, colores);
  const porColor = new Map(leyenda.map((l) => [l.color, l.estado]));
  // Los colores de la propia leyenda no son datos: no deben contarse como
  // lotes ni como "color sin explicar".
  const filasDeLeyenda = new Set<string>();
  for (let f = 0; f < filas.length; f++) {
    for (let c = 0; c < (filas[f] || []).length; c++) {
      const t = String(filas[f][c] || "").trim();
      if (t && aEstado(t) && t.length <= 40) filasDeLeyenda.add(`${f}:${c}`);
    }
  }

  const bloques = detectarBloques(filas);
  const lotes: LoteLeido[] = [];
  const vistos = new Set<string>();
  const sinExplicar = new Map<string, number>();

  for (const b of bloques) {
    let vacias = 0;
    for (let f = b.filaEncabezado + 1; f < filas.length; f++) {
      const fila = filas[f] || [];
      const bruto = String(fila[b.colLote] ?? "").trim();

      if (!bruto) {
        // Varias filas seguidas sin lote: el bloque terminó.
        if (++vacias >= 6) break;
        continue;
      }
      vacias = 0;
      if (/^(total|subtotal|suma)/i.test(bruto)) continue;
      // El número de lote es un número o un código corto; un texto largo es
      // una nota al pie, no un lote.
      if (bruto.length > 12) continue;
      if (!/[0-9]/.test(bruto)) continue;

      const numero = (b.poligono ? `${b.poligono}-${bruto}` : bruto).slice(0, 60);
      const clave = numero.toLowerCase();
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      // --- El estado, por orden de confianza ---
      let estado: string | null = null;
      let origen: LoteLeido["origenEstado"] = "sin marca";

      // (a) Una columna que lo diga con todas sus letras manda sobre el color.
      if (b.colEstado >= 0) {
        const dicho = aEstado(String(fila[b.colEstado] ?? ""));
        if (dicho) {
          estado = dicho;
          origen = "columna";
        }
      }

      // (b) Si no, el relleno de la fila, según la leyenda del archivo.
      if (!estado) {
        const fColores = colores[f] || [];
        for (let c = b.desde; c < b.hasta; c++) {
          const color = fColores[c];
          if (!color) continue;
          if (filasDeLeyenda.has(`${f}:${c}`)) continue;
          const porLeyenda = porColor.get(color);
          if (porLeyenda) {
            estado = porLeyenda;
            origen = "color";
            break;
          }
          // Pintado pero sin explicación: NO se inventa nada, se anota.
          sinExplicar.set(color, (sinExplicar.get(color) || 0) + 1);
        }
      }

      lotes.push({
        numero,
        area: b.colArea >= 0 ? aNumero(fila[b.colArea]) : 0,
        precio: b.colPrecio >= 0 ? aNumero(fila[b.colPrecio]) : 0,
        estado: estado || "disponible",
        notas: "",
        origenEstado: origen,
      });
      b.lotes++;
    }
  }

  return {
    lotes,
    bloques,
    leyenda,
    coloresSinExplicar: [...sinExplicar].map(([color, n]) => ({ color, lotes: n })),
  };
}
