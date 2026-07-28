/**
 * Configuración de Next.js con cabeceras de seguridad.
 *
 * - CSP: limita de dónde puede cargarse el código. `frame-ancestors 'none'`
 *   impide que OVI se incruste en otra web (clickjacking).
 * - nosniff: el navegador no adivina el tipo de archivo (evita ejecutar como
 *   script algo que se sirvió como imagen).
 * - HSTS: obliga HTTPS.
 * - Referrer/Permissions: no filtra URLs internas ni da acceso a cámara/micro
 *   salvo la propia app (necesario para tomar la foto de la boleta).
 */
const isProd = process.env.NODE_ENV === "production";

// 'unsafe-inline' en estilos es necesario para Tailwind/Next; en scripts se
// requiere 'unsafe-inline'/'unsafe-eval' solo fuera de producción (hot reload).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
