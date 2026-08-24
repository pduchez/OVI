import Link from "next/link";
import type { PulsoProyecto } from "@/lib/analytics";

/**
 * Pulso de proyectos: de un vistazo, quién está alimentando OVI y quién no.
 *
 * Es un tablero, así que muestra EXCEPCIONES, no inventario. Los proyectos al
 * día se cuentan pero no se listan: si todo está bien, no hay nada que leer.
 * Lo que ocupa la pantalla es lo que hay que ir a mover.
 *
 * Cabe en una columna estrecha, al lado de la actividad reciente, para no
 * alargar el tablero: aprovecha el espacio que esa lista dejaba vacío.
 */

const TONO = {
  aldia: { punto: "bg-emerald-500", texto: "text-emerald-700", chip: "bg-emerald-50" },
  atrasado: { punto: "bg-amber-500", texto: "text-amber-700", chip: "bg-amber-50" },
  frio: { punto: "bg-rose-500", texto: "text-rose-700", chip: "bg-rose-50" },
  // Gris a propósito: un proyecto que aún no arranca no es una alerta, y
  // pintarlo de rojo taparía a los que sí dejaron de reportar.
  siniciar: { punto: "bg-slate-300", texto: "text-slate-400", chip: "bg-slate-50" },
} as const;

/** «hoy», «ayer», «hace 4 días», «sin movimiento». */
function cuando(p: PulsoProyecto): string {
  if (p.dias === null) return "sin iniciar";
  if (p.dias === 0) return "hoy";
  if (p.dias === 1) return "ayer";
  return `hace ${p.dias} días`;
}

export default function PulsoProyectos({
  filas,
  /** Cuántos pendientes se listan antes de resumir el resto. */
  maximo = 7,
}: {
  filas: PulsoProyecto[];
  maximo?: number;
}) {
  if (!filas.length) return null;

  const cuenta = (e: PulsoProyecto["estado"]) => filas.filter((p) => p.estado === e).length;
  // Lo que pide acción hoy: dejó de reportar, o se está atrasando.
  const pendientes = filas.filter((p) => p.estado === "frio" || p.estado === "atrasado");
  const visibles = pendientes.slice(0, maximo);
  const resto = pendientes.length - visibles.length;
  const sinIniciar = cuenta("siniciar");

  return (
    <div className="card">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-bold text-ovi-ink">Pulso de proyectos</h2>
        <span className="text-xs text-slate-400">últimas 48 h</span>
      </div>

      {/* Resumen: tres números que se leen sin detenerse. */}
      <div className="mb-3 flex gap-1.5 text-[11px] font-semibold">
        <span className={`flex-1 rounded-lg ${TONO.aldia.chip} px-1.5 py-1.5 text-center whitespace-nowrap ${TONO.aldia.texto}`}>
          <span className="block text-base font-bold">{cuenta("aldia")}</span>
          al día
        </span>
        <span className={`flex-1 rounded-lg ${TONO.atrasado.chip} px-1.5 py-1.5 text-center whitespace-nowrap ${TONO.atrasado.texto}`}>
          <span className="block text-base font-bold">{cuenta("atrasado")}</span>
          atrasados
        </span>
        <span className={`flex-1 rounded-lg ${TONO.frio.chip} px-1.5 py-1.5 text-center whitespace-nowrap ${TONO.frio.texto}`}>
          <span className="block text-base font-bold">{cuenta("frio")}</span>
          sin reportar
        </span>
      </div>

      {pendientes.length === 0 ? (
        <p className="rounded-lg bg-emerald-50 py-5 text-center text-sm font-semibold text-emerald-700">
          ✓ Todos los proyectos al día
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visibles.map((p) => (
            <li key={p.id}>
              <Link
                href={`/inventario/${p.id}`}
                className="flex items-center gap-2 py-2 hover:bg-slate-50"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${TONO[p.estado].punto}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                  {p.nombre}
                </span>
                <span className={`shrink-0 text-xs font-semibold ${TONO[p.estado].texto}`}>
                  {cuando(p)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Los que todavía no entran a OVI: se cuentan, sin alarma. */}
      {resto > 0 || sinIniciar > 0 ? (
        <p className="mt-2 border-t border-slate-100 pt-2 text-center text-xs text-slate-400">
          {resto > 0 ? `y ${resto} más pendiente${resto === 1 ? "" : "s"}` : ""}
          {resto > 0 && sinIniciar > 0 ? " · " : ""}
          {sinIniciar > 0 ? `${sinIniciar} proyecto${sinIniciar === 1 ? "" : "s"} sin iniciar` : ""}
        </p>
      ) : null}
    </div>
  );
}
