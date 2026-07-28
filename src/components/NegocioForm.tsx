"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { registrarNegocio } from "@/app/(app)/registrar/actions";
import { money } from "@/lib/format";

type Opt = { value: string; label: string };
type Lote = { id: string; numero: string; precio: number; area: number; estado: string };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full py-3.5 text-lg" disabled={pending}>
      {pending ? "Guardando…" : "Guardar negocio"}
    </button>
  );
}

export default function NegocioForm({
  proyectos,
  vendedores,
}: {
  proyectos: Opt[];
  vendedores: Opt[];
}) {
  const [state, action] = useFormState(registrarNegocio, undefined as { error?: string } | undefined);
  const [projectId, setProjectId] = useState(proyectos.length === 1 ? proyectos[0].value : "");
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [totalLotes, setTotalLotes] = useState<number | null>(null);
  const [loteId, setLoteId] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setLotes([]);
      setTotalLotes(null);
      return;
    }
    setCargando(true);
    fetch(`/api/lotes?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        setLotes(d.lotes || []);
        setTotalLotes(typeof d.total === "number" ? d.total : 0);
        setLoteId("");
      })
      .catch(() => {
        setLotes([]);
        setTotalLotes(0);
      })
      .finally(() => setCargando(false));
  }, [projectId]);

  const loteSel = lotes.find((l) => l.id === loteId);
  const usaInventario = (totalLotes ?? 0) > 0;

  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
    hoy.getDate()
  ).padStart(2, "0")}`;

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Tipo</span>
          <select name="tipo" className="field" defaultValue="reserva">
            <option value="reserva">Reserva (apartado)</option>
            <option value="venta">Venta cerrada</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Fecha</span>
          <input type="date" name="fecha" className="field" defaultValue={hoyStr} />
        </label>
      </div>

      <label className="block">
        <span className="label">Proyecto</span>
        <select
          name="projectId"
          className="field"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          required
        >
          <option value="" disabled>
            Selecciona el proyecto
          </option>
          {proyectos.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {/* Selección de lote: del inventario (precio bloqueado) o manual */}
      {projectId ? (
        cargando ? (
          <p className="text-sm text-slate-500">Cargando lotes disponibles…</p>
        ) : usaInventario ? (
          <>
            <label className="block">
              <span className="label">Lote (del inventario)</span>
              <select
                name="loteId"
                className="field"
                value={loteId}
                onChange={(e) => setLoteId(e.target.value)}
                required
              >
                <option value="" disabled>
                  {lotes.length ? "Selecciona un lote disponible" : "No hay lotes disponibles"}
                </option>
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.numero} — {money(l.precio)}
                    {l.area ? ` · ${l.area} m²` : ""}
                  </option>
                ))}
              </select>
            </label>
            {loteSel ? (
              <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm">
                <div className="font-semibold text-blue-800">
                  Precio del lote: {money(loteSel.precio)}
                </div>
                <div className="text-blue-700">
                  Precio fijado por inventario. Solo los gerentes de ventas y la
                  dirección pueden modificarlo.
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">
              Este proyecto aún no tiene inventario cargado. Puedes registrar de
              forma manual; cuando se cargue el inventario, el precio quedará fijo.
            </p>
            <label className="block">
              <span className="label">Lote (texto)</span>
              <input name="loteRef" className="field" placeholder="Ej. Lote 24" />
            </label>
            <label className="block">
              <span className="label">Precio del lote (US$)</span>
              <input name="precioLote" inputMode="decimal" className="field" placeholder="6500" />
            </label>
          </div>
        )
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Nombre del cliente</span>
          <input name="clienteNombre" className="field" placeholder="Ej. Juan Pérez" required />
        </label>
        <label className="block">
          <span className="label">Teléfono</span>
          <input name="clienteTelefono" inputMode="tel" className="field" placeholder="7000-0000" />
        </label>
      </div>

      <label className="block">
        <span className="label">Fuerza de venta</span>
        <select name="fuerza" className="field" defaultValue="interna">
          <option value="interna">Interna (Oficina)</option>
          <option value="ucoes">UCOES (Externa)</option>
          <option value="destino">Destinopropiedades.com</option>
        </select>
      </label>

      {vendedores.length > 0 ? (
        <label className="block">
          <span className="label">Vendedor</span>
          <select name="vendedorId" className="field" defaultValue="">
            <option value="">— Sin asignar —</option>
            {vendedores.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Prima recibida (US$)</span>
          <input name="prima" inputMode="decimal" className="field" placeholder="0" />
        </label>
        <label className="block">
          <span className="label">Método de la prima</span>
          <select name="metodo" className="field" defaultValue="efectivo">
            <option value="efectivo">Efectivo</option>
            <option value="deposito">Depósito / Transferencia</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="label">Notas (opcional)</span>
        <textarea name="notas" rows={2} className="field" placeholder="Plan de pago, condiciones…" />
      </label>

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
          {state.error}
        </p>
      ) : null}
      <Submit />
    </form>
  );
}
