import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppMovil from "@/components/AppMovil";

export const metadata: Metadata = {
  title: "OVI — Grupo Inmobiliario Chacón",
  description:
    "Plataforma central de administración de ventas de lotes del Grupo Inmobiliario Chacón.",
  robots: { index: false, follow: false },
  applicationName: "OVI",
  manifest: "/manifest.webmanifest",
  // Para que al abrirla desde el ícono del teléfono se comporte como aplicación.
  appleWebApp: {
    capable: true,
    title: "OVI",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#243372",
  // Que el contenido no quede debajo del notch ni de la barra de gestos.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans antialiased">
        {children}
        <AppMovil />
      </body>
    </html>
  );
}
