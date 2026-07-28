import type { Config } from "tailwindcss";

// Paleta OVI: azul profundo institucional + acentos claros. Alto contraste,
// pensado para pantallas viejas y lectura rápida.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ovi: {
          bg: "#0f172a", // fondo oscuro de barras
          primary: "#1d4ed8", // azul principal
          primaryDark: "#1e3a8a",
          accent: "#0ea5e9",
          soft: "#eff6ff",
          ink: "#0f172a",
          muted: "#64748b",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.06)",
      },
    },
  },
  plugins: [],
};

export default config;
