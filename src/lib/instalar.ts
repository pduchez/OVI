"use client";

/**
 * Guarda la oferta de instalación del navegador.
 *
 * Chrome dispara `beforeinstallprompt` una sola vez y muy temprano, casi
 * siempre antes de que React haya montado nada. Si nadie la atrapa en ese
 * instante, se pierde y ya no hay forma de ofrecer la instalación con un
 * botón. Por eso el detector se instala aquí, al cargar el módulo, y no
 * dentro de un componente.
 *
 * Chrome además exige que `prompt()` se llame durante un gesto del usuario
 * (un toque), así que la oferta se guarda y se dispara cuando la persona
 * toca el botón "Instalar".
 */

export type OfertaInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

let guardada: OfertaInstalacion | null = null;
const avisar = new Set<(o: OfertaInstalacion | null) => void>();

function difundir() {
  for (const f of avisar) f(guardada);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Sin esto, Chrome muestra su propia barra y nos quita el control.
    e.preventDefault();
    guardada = e as OfertaInstalacion;
    difundir();
  });
  // Ya se instaló: la oferta dejó de valer.
  window.addEventListener("appinstalled", () => {
    guardada = null;
    difundir();
  });
}

export function ofertaActual(): OfertaInstalacion | null {
  return guardada;
}

/** Se suscribe a los cambios. Devuelve la función para darse de baja. */
export function alCambiarOferta(f: (o: OfertaInstalacion | null) => void): () => void {
  avisar.add(f);
  return () => {
    avisar.delete(f);
  };
}

/** La oferta ya se usó (aceptada o rechazada): no se puede volver a disparar. */
export function olvidarOferta() {
  guardada = null;
  difundir();
}

/** ¿OVI ya está abierta como aplicación instalada, y no dentro del navegador? */
export function yaEstaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  const comoApp = window.matchMedia?.("(display-mode: standalone)")?.matches === true;
  // Safari en iPhone no soporta display-mode; usa su propia marca.
  const enIPhone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return comoApp || enIPhone;
}

export type Plataforma = "android" | "iphone" | "escritorio" | "otro";

/**
 * Qué tipo de equipo es. Solo sirve para enseñar los pasos correctos, así que
 * basta con mirar el user agent: equivocarse no rompe nada, solo enseñaría
 * unas instrucciones que no corresponden.
 */
export function detectarPlataforma(): Plataforma {
  if (typeof navigator === "undefined") return "otro";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  // Los iPad modernos se anuncian como Mac; se distinguen por el táctil.
  const iPadNuevo = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || iPadNuevo) return "iphone";
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return "escritorio";
  return "otro";
}

/**
 * En iPhone solo Safari puede instalar. Chrome y Firefox en iPhone son Safari
 * por dentro, pero sin el botón "Agregar a inicio", así que hay que decirlo.
 */
export function esSafariDeIPhone(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/.test(ua);
}
