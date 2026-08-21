import Link from "next/link";

export const metadata = {
  title: "Cómo usar e instalar OVI",
  robots: { index: false, follow: false },
};

/**
 * Página pública de ayuda para instalar OVI. Está FUERA del login a propósito:
 * quien no logra instalarla todavía no ha entrado, así que la ayuda tiene que
 * estar accesible sin sesión.
 */
export default function AyudaPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/_arbol.png"
            alt="Grupo Inmobiliario Chacón"
            width={72}
            height={72}
            className="mx-auto mb-2 h-18 w-18 object-contain"
          />
          <h1 className="text-2xl font-black text-ovi-primary">Cómo usar OVI</h1>
          <p className="text-sm text-slate-500">
            En el celular y en la computadora
          </p>
        </div>

        {/* Lo primero y más importante */}
        <div className="card mb-5 border-2 border-ovi-accent">
          <h2 className="mb-1 font-bold text-ovi-ink">
            No hace falta instalar nada
          </h2>
          <p className="text-sm text-slate-600">
            OVI funciona <b>igual de bien desde el navegador</b>, en cualquier
            teléfono o computadora. Instalarla solo sirve para tenerla más a la
            mano, con su ícono en la pantalla. Si algo falla al instalar,{" "}
            <b>siga usándola desde el navegador</b>: es exactamente la misma
            aplicación, con la misma información.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Lo práctico es <b>guardar la dirección en favoritos</b> para no
            volver a escribirla.
          </p>
        </div>

        {/* Android */}
        <div className="card mb-4">
          <h2 className="mb-2 font-bold text-ovi-ink">📱 Android</h2>
          <ol className="ml-4 list-decimal space-y-1.5 text-sm text-slate-600">
            <li>Abra OVI en <b>Chrome</b>.</li>
            <li>
              Espere unos segundos: abajo aparece la barra{" "}
              <b>“Instalar OVI”</b>. Tóquela.
            </li>
            <li>
              ¿No aparece? Menú de Chrome (<b>⋮</b>, arriba a la derecha) →{" "}
              <b>Instalar aplicación</b> o <b>Agregar a pantalla principal</b>.
            </li>
          </ol>

          <div className="mt-3 rounded-lg bg-amber-50 p-3">
            <p className="text-sm font-bold text-amber-900">
              Si sale un aviso de Google Play Protect
            </p>
            <p className="mt-1 text-sm text-amber-900">
              Dice algo como <i>“Se bloqueó la app no segura”</i>. Es una alerta
              genérica de Android, <b>no significa que OVI tenga un virus</b>:
              OVI no se baja de ninguna tienda, es la misma página web que usted
              ya está viendo, protegida con HTTPS.
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-900">
              Tiene dos salidas, las dos correctas:
            </p>
            <ol className="ml-4 mt-1 list-decimal space-y-1 text-sm text-amber-900">
              <li>
                <b>Lo más simple:</b> cierre el aviso y use OVI desde el
                navegador. Funciona todo igual.
              </li>
              <li>
                En ese mismo aviso, toque <b>“Instalar de todas formas”</b>.
              </li>
            </ol>
            <p className="mt-2 text-xs text-amber-800">
              Ese aviso suele salir en teléfonos con <b>Chrome desactualizado</b>.
              Si quiere quitarlo de raíz: Play Store → busque <b>Chrome</b> →{" "}
              <b>Actualizar</b>, y vuelva a intentar.
            </p>
          </div>
        </div>

        {/* iPhone */}
        <div className="card mb-4">
          <h2 className="mb-2 font-bold text-ovi-ink">🍎 iPhone y iPad</h2>
          <ol className="ml-4 list-decimal space-y-1.5 text-sm text-slate-600">
            <li>
              Abra OVI en <b>Safari</b>. Tiene que ser Safari: desde otro
              navegador no se puede instalar.
            </li>
            <li>
              Toque el botón <b>Compartir</b> (el cuadrito con la flecha hacia
              arriba, abajo al centro).
            </li>
            <li>
              Baje en la lista y toque <b>Agregar a inicio</b>, y luego{" "}
              <b>Agregar</b>.
            </li>
          </ol>
          <p className="mt-2 text-xs text-slate-500">
            En iPhone <b>no existe</b> la barra azul de instalar ni salen avisos
            de Play Protect: eso es solo de Android.
          </p>
        </div>

        {/* PC */}
        <div className="card mb-4">
          <h2 className="mb-2 font-bold text-ovi-ink">💻 Computadora</h2>
          <ol className="ml-4 list-decimal space-y-1.5 text-sm text-slate-600">
            <li>Abra OVI en <b>Chrome</b>, <b>Edge</b> o el navegador que use.</li>
            <li>
              Guárdela en favoritos con la estrellita <b>☆</b> del final de la
              barra de direcciones. Con eso basta.
            </li>
            <li>
              Si quiere tenerla como programa aparte: en Chrome o Edge aparece un
              ícono de <b>instalar</b> (<b>⊕</b>) al final de esa misma barra.
            </li>
          </ol>
        </div>

        {/* Problemas */}
        <div className="card mb-6">
          <h2 className="mb-2 font-bold text-ovi-ink">Si algo no funciona</h2>
          <dl className="space-y-2.5 text-sm">
            <div>
              <dt className="font-semibold text-slate-700">
                No me acepta la contraseña
              </dt>
              <dd className="text-slate-600">
                Revise mayúsculas. Tras varios intentos fallidos OVI se bloquea
                15 minutos por seguridad: espere, o pida que se la restablezcan.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700">Dice “Sin conexión”</dt>
              <dd className="text-slate-600">
                No hay internet. OVI prefiere avisarle antes que mostrarle
                información vieja: un lote que apareciera disponible sin serlo
                causaría una doble venta.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700">Va lento o no carga</dt>
              <dd className="text-slate-600">
                Espere a tener señal. <b>No registre dos veces</b> sin revisar
                antes si ya quedó guardado.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700">
                Se me borró el ícono del teléfono
              </dt>
              <dd className="text-slate-600">
                Vuelva a instalarla. No se pierde nada: toda la información vive
                en el servidor, no en el teléfono.
              </dd>
            </div>
          </dl>
        </div>

        <div className="text-center">
          <Link href="/login" className="btn-primary inline-block px-6 py-3">
            ← Ir a OVI
          </Link>
        </div>
      </div>
    </main>
  );
}
