"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { reservarLote, liberarLote } from "@/app/(app)/inventario/actions";
import { money } from "@/lib/format";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full py-3.5 text-lg" disabled={pending}>
      {pending ? "Guardando…" : label}
    </button>
  );
}

function Error({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{msg}</p>
  );
}

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Acción de campo: el vendedor está parado en el proyecto, marca el lote y
 * queda bloqueado para todos al instante. Formulario corto y de dedo gordo,
 * pensado para el celular.
 */
export default function ReservaLote({
  lote,
  requiereBoleta,
}: {
  lote: { id: string; numero: string; precio: number; area: number };
  requiereBoleta: boolean;
}) {
  const [state, action] = useFormState(reservarLote, undefined as { error?: string } | undefined);
  const [tipo, setTipo] = useState("reserva");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="loteId" value={lote.id} />

      <div className="rounded-lg bg-ovi-primary/5 px-4 py-3">
        <div className="text-lg font-bold text-ovi-ink">Lote {lote.numero}</div>
        <div className="text-sm text-slate-600">
          {money(lote.precio)}
          {lote.area ? ` · ${lote.area} m²` : ""}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Precio fijado por inventario. No se puede alterar aquí.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">¿Qué pasó?</span>
          <select
            name="tipo"
            className="field"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="reserva">Se reservó (apartado)</option>
            <option value="venta">Se vendió</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Fecha</span>
          <input type="date" name="fecha" className="field" defaultValue={hoy()} />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Nombre del cliente</span>
          <input name="clienteNombre" className="field" placeholder="Ej. Juan Pérez" required />
        </label>
        <label className="block">
          <span className="label">Teléfono</span>
          <input name="clienteTelefono" inputMode="tel" className="field" placeholder="7000-0000" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Depósito recibido (US$){requiereBoleta ? " *" : ""}</span>
          <input
            name="monto"
            inputMode="decimal"
            className="field"
            placeholder="0"
            required={requiereBoleta}
          />
        </label>
        <label className="block">
          <span className="label">N.º de boleta / referencia</span>
          <input name="referencia" className="field" placeholder="Opcional" />
        </label>
      </div>

      <label className="block">
        <span className="label">
          Foto de la boleta{requiereBoleta ? " *" : " (opcional)"}
        </span>
        <input
          type="file"
          name="boleta"
          accept="image/*,.pdf"
          capture="environment"
          className="field bg-white"
          required={requiereBoleta}
        />
        <span className="mt-1 block text-xs text-slate-500">
          {requiereBoleta
            ? "Obligatoria: sin boleta no se puede reservar ni vender. Tómala con la cámara."
            : "Como mando puedes registrar sin boleta; la excepción queda en la bitácora."}
        </span>
      </label>

      <label className="block">
        <span className="label">Notas (opcional)</span>
        <textarea name="notas" rows={2} className="field" placeholder="Plan de pago, condiciones…" />
      </label>

      <Error msg={state?.error} />
      <Submit label={tipo === "venta" ? "Marcar como VENDIDO" : "Marcar como RESERVADO"} />
    </form>
  );
}

/** Revertir: devolver un lote a disponible. Solo capa de mando. */
export function LiberarLote({ lote }: { lote: { id: string; numero: string; estado: string } }) {
  const [state, action] = useFormState(liberarLote, undefined as { error?: string } | undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="loteId" value={lote.id} />
      <p className="text-sm text-slate-600">
        El lote <b>{lote.numero}</b> está <b>{lote.estado}</b>. Liberarlo lo devuelve a
        disponible y da de baja el negocio asociado.
      </p>
      <label className="block">
        <span className="label">Motivo</span>
        <input name="motivo" className="field" placeholder="Ej. el cliente desistió" required />
      </label>
      <Error msg={state?.error} />
      <Submit label="Liberar lote" />
    </form>
  );
}
