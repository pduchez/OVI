"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Mantiene la pantalla al día sola, sin que nadie recargue nada.
 *
 * El problema real que resuelve: dos personas con OVI abierta al mismo tiempo.
 * Una aparta un lote y la otra, que dejó la pantalla abierta hace media hora,
 * lo sigue viendo disponible y se lo ofrece a su cliente. Eso es una doble
 * venta, que es exactamente lo que OVI existe para evitar.
 *
 * Cada minuto vuelve a pedirle los datos al servidor y repinta lo que cambió.
 * No recarga la página: no se pierde el lugar en la lista ni lo que la persona
 * llevara escrito.
 *
 * Tres cuidados, para no estorbar ni gastar de más:
 *  - Solo cuando la pantalla está a la vista. En el bolsillo no consume nada.
 *  - Al volver a la aplicación se actualiza de una, sin esperar el minuto:
 *    ese es el momento en que los datos están más viejos.
 *  - No interrumpe a quien está escribiendo en un campo.
 */

const CADA_MS = 60_000;

/** ¿La persona está escribiendo algo en este momento? */
function estaEscribiendo(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable === true
  );
}

export default function AlDia() {
  const router = useRouter();
  // En una ref para que el intervalo siempre vea la versión viva, sin
  // reprogramarse en cada render.
  const refrescar = useRef(() => {});

  refrescar.current = () => {
    if (document.visibilityState !== "visible") return;
    if (navigator.onLine === false) return;
    if (estaEscribiendo()) return;
    router.refresh();
  };

  useEffect(() => {
    const t = setInterval(() => refrescar.current(), CADA_MS);

    // Al volver de tener la aplicación en segundo plano, los datos son los más
    // viejos que van a estar: se actualiza sin esperar al siguiente minuto.
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar.current();
    };
    document.addEventListener("visibilitychange", alVolver);
    // Y al recuperar la señal, por lo mismo.
    window.addEventListener("online", alVolver);

    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", alVolver);
    };
  }, []);

  return null;
}
