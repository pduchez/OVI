import type { Config } from "tailwindcss";

// Paleta OVI con la identidad del Grupo Inmobiliario Chacón: azul
// institucional, verde hoja y café del tronco (tomados de su marca).
// Alto contraste, pensado para pantallas viejas y lectura rápida.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ovi: {
          bg: "#1b2657", // barra superior (azul institucional oscuro)
          primary: "#243372", // azul principal de la marca
          primaryDark: "#18224e",
          accent: "#b9ce33", // verde hoja del árbol
          accentDark: "#8fa024",
          brown: "#9a4320", // café del tronco
          soft: "#eef1f9",
          ink: "#1b2340",
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
