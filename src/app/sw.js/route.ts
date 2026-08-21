/**
 * Service Worker de OVI, servido desde una ruta para poder sellarlo con la
 * versión del build. Cuando se despliega una versión nueva, el archivo cambia
 * de bytes y el navegador instala el Service Worker nuevo — eso es lo que hace
 * posible la actualización diaria automática.
 *
 * REGLA DE ORO: aquí NO se cachea información. OVI vale por ser en tiempo real;
 * un inventario cacheado que muestre "disponible" un lote ya vendido sería peor
 * que no tener aplicación. Solo se guarda el "casco" de la app (iconos, logos y
 * los archivos de Next que llevan hash en el nombre) para que abra rápido con
 * internet lento.
 *
 * Tampoco se cachea NUNCA `/api/` — ahí viajan las boletas y los documentos de
 * inventario, que no deben quedar guardados en el teléfono.
 */

export const dynamic = "force-static";

// Se evalúa una sola vez, al construir. En Vercel es el commit desplegado.
const VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.OVI_BUILD_ID ||
  new Date().toISOString().slice(0, 16);

const SW = `
// OVI Service Worker — versión ${VERSION}
const VERSION = ${JSON.stringify(VERSION)};
const CACHE = "ovi-casco-" + VERSION;

// El casco mínimo: lo que permite que la app abra y se vea.
const CASCO = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/logos/_arbol.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CASCO)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// La página puede pedirle al SW que se active de una vez (actualización diaria).
self.addEventListener("message", (e) => {
  if (e.data === "ovi-activar-ya") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  // Solo GET. Las Server Actions y los envíos de formulario van por POST y
  // deben pasar intactos: interceptarlos rompería reservas y abonos.
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Nunca tocar la API: ahí van boletas, documentos y datos privados.
  if (url.pathname.startsWith("/api/")) return;

  // Archivos de Next con hash en el nombre: inmutables, se sirven del caché.
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
          return res;
        })
      )
    );
    return;
  }

  // Iconos y logos: del caché, y se refrescan por detrás.
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/logos/") ||
      url.pathname === "/manifest.webmanifest") {
    e.respondWith(
      caches.match(req).then((hit) => {
        const red = fetch(req).then((res) => {
          if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
          return res;
        }).catch(() => hit);
        return hit || red;
      })
    );
    return;
  }

  // Todo lo demás —las páginas con datos— SIEMPRE de la red. Sin caché.
  // Si no hay señal, se avisa con claridad en vez de mostrar datos viejos.
  e.respondWith(
    fetch(req).catch(() =>
      new Response(
        "<!doctype html><html lang=es><meta charset=utf-8>" +
        "<meta name=viewport content='width=device-width,initial-scale=1'>" +
        "<title>Sin conexión</title>" +
        "<body style=\\"font-family:system-ui;padding:2rem;text-align:center;color:#1e293b\\">" +
        "<h1 style=\\"color:#243372\\">Sin conexión</h1>" +
        "<p>OVI necesita internet para mostrarte información al día.</p>" +
        "<p style='color:#64748b;font-size:.9rem'>No se muestran datos guardados: " +
        "un lote que aparezca disponible sin serlo causaría una doble venta.</p>" +
        // Sin onclick: un manejador en línea lo bloquearía la CSP. Un enlace
        // con href vacío ya recarga la misma dirección.
        "<p><a href='' " +
        "style=\\"display:inline-block;margin-top:1rem;background:#243372;color:#fff;" +
        "padding:.8rem 1.5rem;border-radius:.5rem;text-decoration:none\\">Reintentar</a></p>",
        { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
      )
    )
  );
});
`;

export async function GET() {
  return new Response(SW, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // El navegador debe poder detectar una versión nueva sin caché de por medio.
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
