"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { registrarAbono } from "@/app/(app)/registrar/actions";
import { TIPOS_ABONO } from "@/lib/constants";

type Opt = { value: string; label: string };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full py-3.5 text-lg" disabled={pending}>
      {pending ? "Guardando…" : "Guardar abono"}
    </button>
  );
}

export default function AbonoForm({
  negocios,
  negocioSel,
}: {
  negocios: Opt[];
  negocioSel?: string;
}) {
  const [state, action] = useFormState(
    registrarAbono,
    undefined as { error?: string } | undefined
  );
  const [metodo, setMetodo] = useState("efectivo");

  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
    hoy.getDate()
  ).padStart(2, "0")}`;

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Negocio (cliente · proyecto · lote)</span>
        <select name="negocioId" className="field" defaultValue={negocioSel || ""} required>
          <option value="" disabled>
            Selecciona el negocio
          </option>
          {negocios.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Fecha</span>
          <input type="date" name="fecha" className="field" defaultValue={hoyStr} />
        </label>
        <label className="block">
          <span className="label">Cantidad recibida (US$)</span>
          <input name="monto" inputMode="decimal" className="field" placeholder="100" required />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Tipo de abono</span>
          <select name="tipo" className="field" defaultValue="cuota">
            {TIPOS_ABONO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">¿Cómo se recibió?</span>
          <select
            name="metodo"
            className="field"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
          >
            <option value="efectivo">Efectivo (cash)</option>
            <option value="deposito">Depósito / Transferencia</option>
          </select>
        </label>
      </div>

      {metodo === "deposito" ? (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <label className="block">
            <span className="label">Foto de la boleta (obligatoria)</span>
            <input
              type="file"
              name="boleta"
              accept="image/*,application/pdf"
              capture="environment"
              className="field bg-white"
              required
            />
            <span className="mt-1 block text-xs text-blue-700">
              Toma o adjunta la foto del comprobante de depósito/transferencia.
            </span>
          </label>
          <label className="block">
            <span className="label">Referencia (No. de boleta / transferencia)</span>
            <input name="referencia" className="field" placeholder="Ej. 0012345" />
          </label>
        </div>
      ) : (
        <input type="hidden" name="referencia" value="" />
      )}

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
          {state.error}
        </p>
      ) : null}
      <Submit />
    </form>
  );
}
