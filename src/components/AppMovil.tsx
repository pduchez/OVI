"use client";

import { useEffect, useState } from "react";

/**
 * Convierte OVI en una aplicación instalable en el celular y la mantiene al día.
 *
 * Tres cosas:
 *  1. Registra el Service Worker (permite instalarla y que abra rápido).
 *  2. Ofrece el botón "Instalar OVI" cuando el navegador lo permite.
 *  3. Revisa si hay versión nueva cada día a las 8:00 de la mañana, hora de
 *     El Salvador, y la aplica sola. Así todos los usuarios corren la misma
 *     versión sin que nadie tenga que hacer nada.
 *
 * Importante: esto NO afecta los datos, que siempre se leen en vivo del
 * servidor. Lo que se sincroniza a las 8 AM es la aplicación misma.
 */

const HORA_ACTUALIZACION = 8; // 8:00 AM
const TZ_OFFSET_MIN = -6 * 60; // El Salvador es UTC-6 todo el año (sin horario de verano)
const CLAVE = "ovi-ultima-revision";

/**
 * Hora de pared de El Salvador. Se devuelve corrida para que los getters UTC
 * (getUTCHours, getUTCDate…) den la hora salvadoreña, sin importar en qué zona
 * horaria esté configurado el teléfono.
 */
export function horaSV(ahora = new Date()): Date {
  return new Date(ahora.getTime() + TZ_OFFSET_MIN * 60000);
}

/**
 * Etiqueta del "día de trabajo" según el corte de las 8 AM: todo lo que ocurre
 * entre las 8:00 de hoy y las 8:00 de mañana comparte la misma etiqueta. Sirve
 * para saber si el corte ya pasó sin haberse revisado.
 */
export function corteActual(ahora = new Date()): string {
  const sv = horaSV(ahora);
  return new Date(sv.getTime() - HORA_ACTUALIZACION * 3600000).toISOString().slice(0, 10);
}

/** Milisegundos que faltan para las próximas 8:00 AM de El Salvador. */
export function faltaParaCorte(ahora = new Date()): number {
  const sv = horaSV(ahora);
  const objetivo = new Date(sv.getTime());
  objetivo.setUTCHours(HORA_ACTUALIZACION, 0, 0, 0);
  if (objetivo.getTime() <= sv.getTime()) objetivo.setUTCDate(objetivo.getUTCDate() + 1);
  return Math.max(60000, objetivo.getTime() - sv.getTime());
}

export default function AppMovil() {
  const [instalable, setInstalable] = useState<Event | null>(null);
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    /** Busca versión nueva; si la hay, la activa y recarga. */
    async function revisarVersion(reg: ServiceWorkerRegistration, forzarRecarga: boolean) {
      try {
        await reg.update();
      } catch {
        return; // sin señal: se reintenta en la próxima revisión
      }
      const nuevo = reg.waiting;
      if (nuevo && forzarRecarga) {
        nuevo.postMessage("ovi-activar-ya");
        // Cuando el nuevo Service Worker toma el control, se recarga una vez.
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!cancelado) window.location.reload();
        }, { once: true });
      }
    }

    /** ¿Ya pasó un corte de las 8 AM desde la última vez que se revisó? */
    function tocaRevisar(): boolean {
      try {
        return localStorage.getItem(CLAVE) !== corteActual();
      } catch {
        return true; // sin localStorage (modo privado): se revisa igual
      }
    }
    function marcarRevisado() {
      try {
        localStorage.setItem(CLAVE, corteActual());
      } catch {
        /* sin localStorage: no pasa nada, solo se revisa más seguido */
      }
    }

    // Se declara aquí para poder retirarlo en la limpieza del efecto.
    let alVolver: (() => void) | null = null;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
      if (cancelado) return;

      const ponerseAlDia = () => {
        if (!tocaRevisar()) return;
        revisarVersion(reg, true);
        marcarRevisado();
      };

      // Al abrir: si el teléfono estuvo apagado y ya pasaron las 8 AM, se pone
      // al día en ese momento. Un setTimeout solo no bastaría.
      ponerseAlDia();

      // Para los equipos que quedan abiertos: se despierta a las 8:00 en punto.
      const programar = () => {
        temporizador = setTimeout(() => {
          if (cancelado) return;
          revisarVersion(reg, true);
          marcarRevisado();
          programar();
        }, faltaParaCorte());
      };
      programar();

      // Al volver a la aplicación tras dejarla en segundo plano.
      alVolver = () => {
        if (document.visibilityState === "visible") ponerseAlDia();
      };
      document.addEventListener("visibilitychange", alVolver);
    }).catch(() => {
      /* si el navegador no lo permite, la app sigue funcionando igual */
    });

    // Oferta de instalación de Android/Chrome.
    const alInstalable = (e: Event) => {
      e.preventDefault();
      setInstalable(e);
      try {
        setOculto(localStorage.getItem("ovi-instalar-oculto") === "1");
      } catch {
        setOculto(false);
      }
    };
    window.addEventListener("beforeinstallprompt", alInstalable);

    return () => {
      cancelado = true;
      if (temporizador) clearTimeout(temporizador);
      if (alVolver) document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("beforeinstallprompt", alInstalable);
    };
  }, []);

  if (!instalable || oculto) return null;

  return (
    <div className="no-print fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-xl bg-ovi-primary px-4 py-3 text-white shadow-lg sm:left-auto sm:right-4 sm:w-96">
      <div className="min-w-0 flex-1">
        <div className="font-bold">Instalar OVI</div>
        <div className="text-sm text-white/80">
          Queda como una aplicación en tu teléfono.
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-bold text-ovi-primary"
        onClick={async () => {
          const p = instalable as Event & {
            prompt: () => Promise<void>;
            userChoice: Promise<{ outcome: string }>;
          };
          await p.prompt();
          await p.userChoice.catch(() => null);
          setInstalable(null);
        }}
      >
        Instalar
      </button>
      <button
        type="button"
        aria-label="Ahora no"
        className="shrink-0 px-1 text-xl leading-none text-white/70"
        onClick={() => {
          setOculto(true);
          try {
            localStorage.setItem("ovi-instalar-oculto", "1");
          } catch {
            /* sin localStorage: solo se oculta en esta sesión */
          }
        }}
      >
        ×
      </button>
    </div>
  );
}
