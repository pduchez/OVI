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
  // Next 16 emite el nombre moderno (`mobile-web-app-capable`), que Safari
  // entiende desde iOS 15.4. En los iPhone más viejos que siguen en la calle
  // solo vale el nombre antiguo, así que se emite también: sin él, la app se
  // abriría dentro de Safari con la barra de direcciones en vez de a pantalla
  // completa.
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

/**
 * Toda la aplicación se renderiza por petición.
 *
 * No es una preferencia: la CSP de `src/middleware.ts` usa un NONCE distinto en
 * cada petición, y Next solo puede estampar ese nonce en sus <script> mientras
 * está renderizando esa petición. Una página pregenerada en el build llevaría
 * el nonce de otro momento —o ninguno—, así que el navegador bloquearía TODOS
 * sus scripts y la página quedaría sin JavaScript: sin botón de instalar, sin
 * Service Worker y sin formularios que respondan. Al declararlo aquí, en la
 * raíz, queda cubierta también cualquier página que se agregue después.
 */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Se permite acercar con los dedos: mucha gente en campo necesita agrandar
  // la letra, y bloquear el zoom la dejaría sin poder leer el inventario.
  maximumScale: 5,
  userScalable: true,
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
