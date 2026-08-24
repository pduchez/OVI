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

/**
 * ¿Ese precio es UNITARIO —por vara², por m²— y no el del lote?
 *
 * Las listas del Grupo traen «PRECIO DE VARA» (125) justo antes de «PRECIO»
 * (35,770). Quedarse con la primera columna que empiece por «precio» pondría
 * $125 como precio del lote: un error que se convierte en una venta a precio
 * equivocado.
 */
function esPrecioUnitario(encabezado: string): boolean {
  const k = norm(encabezado);
  return (
    k.includes("vara") ||
    k.includes("v2") ||
    k.includes("vrs") ||
    k.includes("m2") ||
    k.includes("unitario") ||
    k.includes("pormetro") ||
    k.includes("pormt")
  );
}
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

// --- 2. Las secciones de lotes -------------------------------------------

/**
 * Una hoja real no es una tabla: es una REJILLA de secciones de polígono,
 * apiladas hacia abajo y puestas una al lado de otra, y —esto es lo que
 * engaña— cada columna avanza a su propio ritmo. En Nuevo San Vicente, la
 * banda izquierda va por el POLIGONO 28 mientras la del medio sigue listando
 * lotes del 21 y la derecha ya arrancó el 32.
 *
 * Por eso no se busca «la fila de encabezados»: se buscan las BANDAS
 * verticales —las columnas donde aparece un encabezado LOTE, en cualquier
 * parte de la hoja— y cada banda se recorre de arriba abajo por separado,
 * anotando el polígono que la va titulando.
 */
function bandas(filas: string[][]): { desde: number; hasta: number }[] {
  const cols = new Set<number>();
  for (const fila of filas) {
    for (let c = 0; c < (fila || []).length; c++) {
      if (ENC_LOTE(norm(fila[c]))) cols.add(c);
    }
  }
  const orden = [...cols].sort((a, b) => a - b);
  return orden.map((desde, i) => ({
    desde,
    // Hasta donde empieza la banda siguiente; la última, un ancho razonable.
    hasta: i + 1 < orden.length ? orden[i + 1] : desde + 8,
  }));
}

/** Las columnas de una sección, leídas de SU fila de encabezados. */
function columnasDe(
  fila: string[],
  desde: number,
  hasta: number
): { area: number; precio: number; estado: number } {
  let area = -1;
  let areaVaras = -1;
  let precio = -1;
  let contado = -1;
  let unitario = -1;
  let estado = -1;
  for (let c = desde + 1; c < hasta; c++) {
    const crudo = fila[c];
    const k = norm(crudo);
    if (!k) continue;
    if (ENC_AREA(k)) {
      if (esVaras(crudo)) {
        if (areaVaras < 0) areaVaras = c;
      } else if (area < 0) {
        area = c;
      }
    } else if (ENC_PRECIO(k)) {
      if (k.includes("contado")) {
        if (contado < 0) contado = c;
      } else if (esPrecioUnitario(crudo)) {
        if (unitario < 0) unitario = c;
      } else if (precio < 0) {
        precio = c;
      }
    } else if (ENC_ESTADO(k) && estado < 0) {
      estado = c;
    }
  }
  if (area < 0) area = areaVaras;
  // Orden de confianza del precio: el de contado, luego el del lote a secas, y
  // solo como último recurso uno unitario (por vara² o por m²).
  if (contado >= 0) precio = contado;
  else if (precio < 0) precio = unitario;
  return { area, precio, estado };
}

/** ¿Esta celda titula una sección? Devuelve el polígono, o "". */
function tituloDeSeccion(texto: string): string {
  const m = String(texto || "").match(
    /\b(?:pol[ií]gono|poligono|manzana|mzn|bloque|sector|etapa)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\-]{0,7})\b/i
  );
  return m ? m[1].toUpperCase() : "";
}

// --- 3. Lectura completa de una hoja -------------------------------------

export function leerHojaDeInventario(filas: string[][], colores: string[][]): LecturaHoja {
  const leyenda = leerLeyenda(filas, colores);
  const porColor = new Map(leyenda.map((l) => [l.color, l.estado]));

  // Las celdas de la propia leyenda no son datos.
  const esLeyenda = new Set<string>();
  for (let f = 0; f < filas.length; f++) {
    for (let c = 0; c < (filas[f] || []).length; c++) {
      const t = String(filas[f][c] || "").trim();
      if (t && t.length <= 40 && aEstado(t)) {
        for (const dc of [-3, -2, -1, 0, 1, 2, 3]) esLeyenda.add(`${f}:${c + dc}`);
      }
    }
  }

  const bloques: Bloque[] = [];
  const lotes: LoteLeido[] = [];
  const vistos = new Set<string>();
  const sinExplicar = new Map<string, number>();

  for (const banda of bandas(filas)) {
    let poligono = "";
    let cols: { area: number; precio: number; estado: number } | null = null;
    let actual: Bloque | null = null;

    for (let f = 0; f < filas.length; f++) {
      const fila = filas[f] || [];
      const celda = String(fila[banda.desde] ?? "").trim();

      // ¿Empieza una sección nueva? El título puede estar en cualquier celda
      // de la banda, no solo en la primera.
      let titulo = "";
      for (let c = banda.desde; c < banda.hasta && !titulo; c++) {
        titulo = tituloDeSeccion(String(fila[c] ?? ""));
      }
      if (titulo) {
        poligono = titulo;
        cols = null; // hasta que aparezca su fila de encabezados
        actual = null;
        continue;
      }

      // ¿Es la fila de encabezados de esta sección?
      if (ENC_LOTE(norm(celda))) {
        cols = columnasDe(fila, banda.desde, banda.hasta);
        actual = {
          poligono,
          filaEncabezado: f,
          colLote: banda.desde,
          colArea: cols.area,
          colPrecio: cols.precio,
          colEstado: cols.estado,
          desde: banda.desde,
          hasta: banda.hasta,
          lotes: 0,
        };
        bloques.push(actual);
        continue;
      }

      if (!cols || !actual || !celda) continue;
      if (/^(total|subtotal|suma)/i.test(celda)) continue;
      // Un número de lote es corto y lleva dígitos; un texto largo es una nota.
      if (celda.length > 12 || !/[0-9]/.test(celda)) continue;

      const numero = (poligono ? `${poligono}-${celda}` : celda).slice(0, 60);
      const clave = numero.toLowerCase();
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      // --- El estado, por orden de confianza ---
      let estado: string | null = null;
      let origen: LoteLeido["origenEstado"] = "sin marca";

      // (a) Una columna que lo diga con letras manda sobre el color.
      if (cols.estado >= 0) {
        const dicho = aEstado(String(fila[cols.estado] ?? ""));
        if (dicho) {
          estado = dicho;
          origen = "columna";
        }
      }

      // (b) Si no, el relleno de la fila, según la leyenda del archivo.
      if (!estado) {
        const fColores = colores[f] || [];
        for (let c = banda.desde; c < banda.hasta; c++) {
          const color = fColores[c];
          if (!color || esLeyenda.has(`${f}:${c}`)) continue;
          const porLeyenda = porColor.get(color);
          if (porLeyenda) {
            estado = porLeyenda;
            origen = "color";
            break;
          }
          // Pintado sin explicación: no se adivina, se anota.
          sinExplicar.set(color, (sinExplicar.get(color) || 0) + 1);
        }
      }

      lotes.push({
        numero,
        area: cols.area >= 0 ? aNumero(fila[cols.area]) : 0,
        precio: cols.precio >= 0 ? aNumero(fila[cols.precio]) : 0,
        estado: estado || "disponible",
        notas: "",
        origenEstado: origen,
      });
      actual.lotes++;
    }
  }

  return {
    lotes,
    bloques: bloques.filter((b) => b.lotes > 0),
    leyenda,
    coloresSinExplicar: [...sinExplicar].map(([color, n]) => ({ color, lotes: n })),
  };
}
