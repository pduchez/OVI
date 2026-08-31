/**
 * Genera el manual de cada vendedora a partir de UNA plantilla.
 *
 *   node scripts/guias-vendedoras.mjs      (lo llama `npm run guias`)
 *
 * Todos los manuales son el mismo documento: cambia el nombre, el usuario y
 * el proyecto. Tenerlos como copias sueltas significaba que arreglar una frase
 * había que arreglarla ocho veces —y olvidarse en la séptima—. Aquí la frase
 * se arregla una vez, en `_plantilla-vendedora.html`, y sale en todas.
 *
 * Para sumar una vendedora: una línea en VENDEDORAS. Nada más.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs", "guias");

/**
 * `proyectos` es una lista porque hay quien lleva varias etapas o proyectos.
 * El primero da nombre al manual; el resto salen en el bloque de etapas.
 */
export const VENDEDORAS = [
  {
    archivo: "13-adelaida-city", salida: "OVI-Adelaida-City",
    nombre: "Meyvelin", usuario: "meyvelin", genero: "f",
    proyectos: ["Adelaida City"], pie: "Izalco, Sonsonate",
    clave: "AdelaidaCity2026",
  },
  {
    archivo: "14-via-bypass", salida: "OVI-Via-Bypass",
    nombre: "Karla", usuario: "karla", genero: "f",
    proyectos: ["Vía Bypass"], pie: "Usulután",
    clave: "ViaBypass2026",
    nota: "En OVI el proyecto aparece con el nombre <b>Vía Bypass</b>. Es el del Bypass: si en la lista busca otro nombre, no lo va a encontrar.",
  },
  {
    archivo: "15-condado-el-triunfo", salida: "OVI-Condado-El-Triunfo",
    nombre: "Luci", usuario: "luci", genero: "f",
    proyectos: ["Condado El Triunfo"], pie: "Jiquilisco, Usulután",
    clave: "ElTriunfo2026Sv",
  },
  {
    archivo: "17-santiago", salida: "OVI-Santiago",
    nombre: "Morena", usuario: "morena", genero: "f",
    proyectos: ["Santiago City", "Cumbres de Santiago"],
    titulo: "Santiago City<br>y Cumbres de Santiago",
    pie: "Usulután · Las dos etapas, un solo usuario",
    clave: "Santiago2026Sv",
    etapas: true,
  },
  {
    archivo: "18-altos-de-las-mercedes", salida: "OVI-Altos-de-Las-Mercedes",
    nombre: "Dalila", usuario: "dalila", genero: "f",
    proyectos: ["Altos de Las Mercedes"], pie: "Grupo Inmobiliario Chacón",
    clave: "LasMercedes2026",
  },
  {
    archivo: "19-condado-del-golfo", salida: "OVI-Condado-del-Golfo",
    nombre: "Kenia", usuario: "kenia", genero: "f",
    proyectos: ["Condado del Golfo"], pie: "La Unión",
    clave: "ElGolfo2026Sv",
  },
  {
    archivo: "20-vista-al-mar", salida: "OVI-Vista-al-Mar",
    nombre: "Mirna", usuario: "mirna", genero: "f",
    proyectos: ["Vista al Mar"], pie: "Acajutla, Sonsonate",
    clave: "VistaAlMar2026",
  },
  {
    archivo: "21-panamerican-city", salida: "OVI-Panamerican-City",
    nombre: "Alexander", usuario: "alexander", genero: "m",
    proyectos: ["Panamerican City"], pie: "Usulután",
    clave: "Panamerican2026",
  },
  {
    archivo: "22-hilo-de-oro-y-colina", salida: "OVI-Hilo-de-Oro-y-Colina-City",
    nombre: "Concepción", usuario: "concepcion", genero: "f",
    // Dos proyectos, cada uno con su etapa en venta. Los cuatro están en OVI
    // como listas separadas porque cada uno tiene sus lotes y sus precios.
    proyectos: ["Condado Hilo de Oro", "Brisas del Valle", "Colina City", "Helen City"],
    titulo: "Condado Hilo de Oro<br>y Colina City",
    pie: "Ilobasco, Cabañas · Con sus etapas en venta",
    clave: "HiloDeOro2026",
    etapas: true,
    notaEtapas:
      "<b>Hilo de Oro</b> vende hoy la etapa <b>Brisas del Valle</b>, y " +
      "<b>Colina City</b> vende la etapa <b>Helen City</b>. En OVI los cuatro " +
      "aparecen como listas separadas, porque cada uno tiene sus propios lotes " +
      "y sus propios precios.",
  },
  {
    archivo: "23-villa-lourdes-y-portal-las-luces",
    salida: "OVI-Villa-Lourdes-y-Portal-Las-Luces",
    nombre: "Gaby", usuario: "gaby", genero: "f",
    // Dos proyectos DISTINTOS, en departamentos distintos. Por eso el aviso de
    // abajo no dice «etapas»: decírselo sería enseñarle algo que no es cierto.
    proyectos: ["Condado Villa Lourdes", "Portal Las Luces"],
    titulo: "Condado Villa Lourdes<br>y Portal Las Luces",
    pie: "Lourdes, Colón · Chalatenango",
    clave: "VillaLourdes2026",
    etapas: true,
    notaEtapas:
      "Usted lleva <b>dos proyectos distintos</b>, no dos etapas de uno solo: " +
      "<b>Condado Villa Lourdes</b> (Lourdes, Colón) y <b>Portal Las Luces</b> " +
      "(Chalatenango). En OVI cada uno es su propia lista, porque cada uno " +
      "tiene sus lotes y sus precios. En la pantalla busque <b>Condado Villa " +
      "Lourdes</b>: así se llama en OVI, aunque usted le diga Villa Lourdes.",
  },
];

/** Bloque de aviso para quien lleva más de una lista. Es su único riesgo real. */
function bloqueEtapas(v) {
  if (!v.etapas && !v.nota) return "";
  if (v.nota) return `\n<p class="nota">${v.nota}</p>`;
  const cuantos = v.proyectos.length;
  return `
<div class="clave">
<div class="rotulo">Lo único distinto en su caso</div>
${v.notaEtapas ? `<p>${v.notaEtapas}</p>` : `<p>${v.proyectos.join(" y ")} son <b>etapas del mismo proyecto</b>, pero en OVI aparecen como <b>listas separadas</b>. Tienen que estarlo: cada etapa tiene sus propios lotes y sus propios precios.</p>`}
<p>Eso significa que <b>antes de tocar cualquier lote usted escoge la lista</b>.
Es el único paso donde se puede equivocar y no lo notaría de inmediato:
apartaría el lote 12 de la lista equivocada.</p>
<p><b>La regla:</b> mire siempre el nombre en la parte de arriba de la pantalla
antes de marcar nada.</p>
</div>`;
}

/** El paso 2 de la carga: escoger proyecto. Cambia según lleve uno o varios. */
function pasoEscoger(v) {
  if (v.proyectos.length === 1) {
    return `<div class="paso-t"><span class="n">2</span> Toque <b>${v.proyectos[0]}</b>. Es el único proyecto que va a ver: es el suyo.</div>`;
  }
  return `<div class="paso-t"><span class="n">2</span> Va a ver <b>${v.proyectos.length}</b>: ${v.proyectos
    .map((p) => `<b>${p}</b>`)
    .join(", ")}. Toque la que va a cargar.</div>
<div class="paso-t"><span class="n">2b</span> Fíjese en el nombre de arriba: tiene que decir la que usted escogió. Si dice otra, vuelva atrás con <b>← Proyectos</b>.</div>`;
}

export function generar() {
  const plantilla = readFileSync(path.join(DIR, "_plantilla-vendedora.html"), "utf8");
  for (const v of VENDEDORAS) {
    const varios = v.proyectos.length > 1;
    const html = plantilla
      .replaceAll("{{NOMBRE}}", v.nombre)
      .replaceAll("{{USUARIO}}", v.usuario)
      .replaceAll("{{PROYECTO}}", varios ? "sus proyectos" : v.proyectos[0])
      .replaceAll("{{TITULO}}", v.titulo || v.proyectos[0])
      .replaceAll("{{PIE}}", v.pie)
      .replaceAll("{{CLAVE_EJEMPLO}}", v.clave)
      .replaceAll("{{SALUDO}}", v.genero === "m" ? "Bienvenido" : "Bienvenida")
      .replaceAll("{{COLEGAS}}", v.genero === "m" ? "otros compañeros" : "otras compañeras")
      .replaceAll(
        "{{FRASE_ENTRADA}}",
        varios
          ? `Usted lleva ${v.proyectos.length} listas en OVI, y con un solo usuario maneja todas.`
          : `${v.proyectos[0]} entra a OVI, y usted lo lleva.`
      )
      .replaceAll("{{BLOQUE_ETAPAS}}", bloqueEtapas(v))
      .replaceAll("{{PASO_ESCOGER}}", pasoEscoger(v))
      .replaceAll(
        "{{ROTULO_CIERRE}}",
        varios ? "Usted lleva todas sus listas" : `Usted lleva ${v.proyectos[0]}`
      )
      .replaceAll(
        "{{CIERRE_EXTRA}}",
        varios
          ? "\n<p><b>Cada lista se carga por separado</b>, con su propio archivo de lotes. Termine una completa antes de empezar la siguiente.</p>"
          : ""
      );
    writeFileSync(path.join(DIR, v.archivo + ".html"), html);
  }
  return VENDEDORAS.map((v) => ({ fuente: v.archivo, salida: v.salida }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const hechas = generar();
  for (const h of hechas) console.log("·", h.fuente + ".html");
}
