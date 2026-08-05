import { NextResponse, type NextRequest } from "next/server";

/**
 * Cabeceras de seguridad por petición.
 *
 * El objetivo principal es la CSP con NONCE. Con `script-src 'unsafe-inline'`,
 * cualquier fallo de XSS que llegara a colar una etiqueta <script> se
 * ejecutaría; con nonce, el navegador solo ejecuta los scripts que llevan el
 * número aleatorio que este middleware acaba de generar, y ese número cambia
 * en cada petición, así que un atacante no lo puede adivinar ni reutilizar.
 *
 * Las cabeceras que no dependen de la petición (HSTS, nosniff, etc.) siguen
 * en next.config.mjs.
 */
export function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' deja que los scripts con nonce carguen los suyos, que
    // es como Next.js arranca sus fragmentos. En desarrollo hace falta
    // 'unsafe-eval' para la recarga en caliente.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Los estilos sí llevan 'unsafe-inline': Next inyecta estilos en línea y
    // un estilo no ejecuta código.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self'", // el Service Worker de la app móvil
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  // El nonce viaja a la petición para que Next lo ponga en sus <script>.
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  // Aísla la ventana de OVI de cualquier otra que la abra.
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  return res;
}

export const config = {
  // Todo salvo los estáticos: llevan su propia caché y no ejecutan HTML.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|icons|logos|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
