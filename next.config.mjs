/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Permite subir boletas y documentos de inventario (Excel/PDF) vía Server Actions.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
