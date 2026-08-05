/**
 * Configuración de Next.js con cabeceras de seguridad.
 *
 * - CSP: se arma por petición en src/middleware.ts (lleva nonce).
 * - nosniff: el navegador no adivina el tipo de archivo (evita ejecutar como
 *   script algo que se sirvió como imagen).
 * - HSTS: obliga HTTPS.
 * - Referrer/Permissions: no filtra URLs internas ni da acceso a cámara/micro
 *   salvo la propia app (necesario para tomar la foto de la boleta).
 */
const isProd = process.env.NODE_ENV === "production";

// La Content-Security-Policy se arma POR PETICIÓN en src/middleware.ts, para
// poder incluir un nonce distinto cada vez. Aquí quedan solo las cabeceras
// que son iguales en todas las respuestas.

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Impide que otro sitio incruste recursos nuestros.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

/**
 * Las páginas llevan datos de la sesión de quien las pide. Sin esto, una
 * caché intermedia (un proxy de oficina, por ejemplo) podría guardar la
 * página de un usuario y servírsela a otro.
 */
const noCache = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // no revelar la tecnología del servidor
  experimental: {
    // Permite subir boletas y documentos de inventario (Excel/PDF) vía Server Actions.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Nunca cachear HTML ni API: llevan datos de la sesión.
      { source: "/api/:path*", headers: noCache },
      {
        source: "/((?!_next/static|_next/image|icons|logos|fonts|manifest.webmanifest).*)",
        headers: noCache,
      },
    ];
  },
};

export default nextConfig;
