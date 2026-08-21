"use client";

import { useCallback, useEffect, useState } from "react";
import {
  alCambiarOferta,
  detectarPlataforma,
  esSafariDeIPhone,
  ofertaActual,
  olvidarOferta,
  yaEstaInstalada,
  type OfertaInstalacion,
  type Plataforma,
} from "@/lib/instalar";

/**
 * Instalación asistida, sola, al entrar.
 *
 * Nadie tiene que mandarle un instructivo a nadie: en cuanto la persona firma,
 * OVI mira desde qué equipo entró y le enseña ahí mismo los pasos de ESE
 * equipo. En Android y en computadora, además, el botón instala de verdad.
 *
 * Solo aparece si todavía no está instalada, y se calla el resto del día si la
 * persona dice "ahora no". Si ya está instalada, no aparece nunca.
 */

const CLAVE_POSPUESTA = "ovi-instalar-pospuesta";
/** Margen para que Chrome alcance a ofrecer la instalación antes de dibujar. */
const ESPERA_MS = 1500;

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function pospuestaHoy(): boolean {
  try {
    return localStorage.getItem(CLAVE_POSPUESTA) === hoy();
  } catch {
    return false; // sin localStorage (modo privado): se muestra igual
  }
}

function posponer() {
  try {
    localStorage.setItem(CLAVE_POSPUESTA, hoy());
  } catch {
    /* sin localStorage: solo se volverá a mostrar antes de lo previsto */
  }
}

export default function InstalarOVI() {
  const [abierto, setAbierto] = useState(false);
  const [plataforma, setPlataforma] = useState<Plataforma>("otro");
  const [safariIPhone, setSafariIPhone] = useState(true);
  const [oferta, setOferta] = useState<OfertaInstalacion | null>(null);
  const [instalando, setInstalando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (yaEstaInstalada()) return; // abierta como aplicación: no hay nada que ofrecer
    setPlataforma(detectarPlataforma());
    setSafariIPhone(esSafariDeIPhone());
    setOferta(ofertaActual());
    const baja = alCambiarOferta(setOferta);

    // Si ya se instaló mientras estaba abierta, el aviso se retira solo.
    const alInstalar = () => {
      setListo(true);
      setTimeout(() => setAbierto(false), 2500);
    };
    window.addEventListener("appinstalled", alInstalar);

    let t: ReturnType<typeof setTimeout> | undefined;
    if (!pospuestaHoy()) {
      t = setTimeout(() => setAbierto(true), ESPERA_MS);
    }
    return () => {
      baja();
      window.removeEventListener("appinstalled", alInstalar);
      if (t) clearTimeout(t);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!oferta) return;
    setInstalando(true);
    try {
      await oferta.prompt();
      const { outcome } = await oferta.userChoice;
      if (outcome === "accepted") setListo(true);
      else posponer();
    } catch {
      /* el navegador se negó: quedan los pasos manuales a la vista */
    } finally {
      // La oferta del navegador solo se puede usar una vez.
      olvidarOferta();
      setInstalando(false);
    }
  }, [oferta]);

  const ahoraNo = useCallback(() => {
    posponer();
    setAbierto(false);
  }, []);

  if (!abierto) return null;

  return (
    <div className="no-print fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        {listo ? (
          <div className="py-4 text-center">
            <div className="text-4xl">✓</div>
            <h2 className="mt-2 text-lg font-black text-ovi-primary">
              Listo, OVI ya quedó instalada
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Búsquela en la pantalla de su teléfono con este ícono.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/icon-192.png"
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 rounded-xl"
              />
              <div>
                <h2 className="text-lg font-black leading-tight text-ovi-primary">
                  Deje OVI en su pantalla
                </h2>
                <p className="text-sm text-slate-500">
                  Para entrar de un toque, sin escribir la dirección.
                </p>
              </div>
            </div>

            <Pasos
              plataforma={plataforma}
              safariIPhone={safariIPhone}
              hayOferta={!!oferta}
            />

            <div className="mt-4 flex flex-col gap-2">
              {oferta ? (
                <button
                  type="button"
                  onClick={instalar}
                  disabled={instalando}
                  className="w-full rounded-xl bg-ovi-primary px-4 py-3 font-bold text-white disabled:opacity-60"
                >
                  {instalando ? "Instalando…" : "Instalar OVI"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={ahoraNo}
                className="w-full rounded-xl px-4 py-3 font-semibold text-slate-500"
              >
                Seguir en el navegador
              </button>
            </div>

            <p className="mt-2 text-center text-xs text-slate-400">
              Instalar es solo comodidad: desde el navegador funciona exactamente
              igual, con la misma información.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Los pasos concretos del equipo desde el que entró la persona. */
function Pasos({
  plataforma,
  safariIPhone,
  hayOferta,
}: {
  plataforma: Plataforma;
  safariIPhone: boolean;
  hayOferta: boolean;
}) {
  const lista = "ml-4 list-decimal space-y-1.5 text-sm text-slate-600";

  if (plataforma === "iphone") {
    if (!safariIPhone) {
      return (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-bold">En iPhone hay que usar Safari</p>
          <p className="mt-1">
            Desde este navegador no se puede instalar. Copie la dirección, ábrala
            en <b>Safari</b> y vuelva a entrar: ahí sí aparece la opción.
          </p>
        </div>
      );
    }
    return (
      <ol className={lista}>
        <li>
          Toque el botón <b>Compartir</b>: el cuadrito con la flecha hacia
          arriba, abajo al centro de la pantalla.
        </li>
        <li>
          Baje en la lista y toque <b>Agregar a inicio</b>.
        </li>
        <li>
          Toque <b>Agregar</b>, arriba a la derecha. Ya queda el ícono.
        </li>
      </ol>
    );
  }

  if (plataforma === "android") {
    if (hayOferta) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            Toque el botón azul de abajo y confirme <b>Instalar</b>.
          </p>
          <AvisoPlayProtect />
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <ol className={lista}>
          <li>
            Abra el menú de Chrome: los <b>⋮</b> tres puntos, arriba a la
            derecha.
          </li>
          <li>
            Toque <b>Instalar aplicación</b> o <b>Agregar a pantalla principal</b>.
          </li>
        </ol>
        <AvisoPlayProtect />
      </div>
    );
  }

  if (plataforma === "escritorio") {
    if (hayOferta) {
      return (
        <p className="text-sm text-slate-600">
          Haga clic en el botón azul de abajo y confirme <b>Instalar</b>. OVI
          queda como un programa más, con su propia ventana.
        </p>
      );
    }
    return (
      <ol className={lista}>
        <li>
          Mire el final de la barra de direcciones, arriba: aparece un ícono de{" "}
          <b>instalar</b> (<b>⊕</b>). Haga clic ahí.
        </li>
        <li>
          Si no aparece, guarde la página en favoritos con la estrellita{" "}
          <b>☆</b>. Con eso basta para entrar rápido.
        </li>
      </ol>
    );
  }

  return (
    <p className="text-sm text-slate-600">
      Guarde esta dirección en los favoritos de su navegador para entrar sin
      volver a escribirla.
    </p>
  );
}

/**
 * El aviso de Play Protect es de Android, no de OVI, y asusta. Se explica aquí
 * mismo para que nadie tenga que preguntar ni esperar respuesta.
 */
function AvisoPlayProtect() {
  return (
    <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
      <b>¿Le sale un aviso de Google Play Protect?</b> Es una alerta genérica de
      Android; OVI no tiene ningún virus. Toque{" "}
      <b>&ldquo;Instalar de todas formas&rdquo;</b>, o cierre el aviso y siga
      usando OVI desde el navegador: funciona igual.
    </div>
  );
}
