/**
 * Genera los PDF de las guías a partir de su fuente en HTML.
 *
 *   npm run guias
 *
 * Usa el Chromium que ya trae Playwright para imprimir; no agrega ninguna
 * dependencia a la aplicación (Playwright no es dependencia de OVI: si no está
 * instalado, el script lo dice y no rompe nada).
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs", "guias");

const GUIAS = [
  { fuente: "1-direccion", salida: "OVI-direccion" },
  { fuente: "2-mandos", salida: "OVI-mandos" },
  { fuente: "3-vendedores", salida: "OVI-vendedores" },
  { fuente: "4-gerente", salida: "OVI-gerente-de-ventas" },
  { fuente: "5-asistente", salida: "OVI-asistente-ejecutiva" },
  { fuente: "6-vendedor", salida: "OVI-vendedor" },
  { fuente: "7-impl-asistente", salida: "OVI-implementacion-asistente-ejecutiva" },
  { fuente: "8-impl-vendedor-chacon", salida: "OVI-implementacion-vendedores-chacon-ucoes" },
  { fuente: "9-impl-vendedor-dp", salida: "OVI-implementacion-vendedores-destinopropiedades" },
];

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "Falta Playwright para imprimir los PDF.\n" +
      "Instálalo solo para esta tarea:  npm i -D playwright\n" +
      "(No es dependencia de OVI: la aplicación no lo necesita para funcionar.)"
  );
  process.exit(1);
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage();

for (const g of GUIAS) {
  await pagina.goto(`file://${path.join(DIR, g.fuente + ".html")}`, { waitUntil: "networkidle" });
  await pagina.pdf({
    path: path.join(DIR, g.salida + ".pdf"),
    format: "Letter",
    printBackground: false,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate:
      '<div style="width:100%;font-size:8pt;font-family:Georgia,serif;text-align:center;color:#000;padding:0 20mm;">' +
      '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: "22mm", bottom: "18mm", left: "20mm", right: "20mm" },
  });
  console.log("✓", g.salida + ".pdf");
}

await navegador.close();
