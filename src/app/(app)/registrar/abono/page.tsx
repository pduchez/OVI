import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import { negocioOptions } from "@/lib/options";
import { TIPOS_ABONO, METODOS_PAGO } from "@/lib/constants";
import { inputDate } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { Field, Select, Input } from "@/components/fields";
import { registrarAbono } from "../actions";

export const dynamic = "force-dynamic";

export default async function AbonoPage({
  searchParams,
}: {
  searchParams: { negocio?: string };
}) {
  const user = (await getCurrentUser())!;
  const scope = await getScope(user);
  const negocios = await negocioOptions(scope);

  if (negocios.length === 0) {
    return (
      <EmptyState
        title="No hay negocios activos"
        hint="Primero registra una reserva o venta para poder abonarle."
        cta={{ href: "/registrar/negocio", label: "Registrar negocio" }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Abono / Pago"
        subtitle="El cliente hizo un pago"
        action={
          <Link href="/registrar" className="btn-ghost no-print">
            ← Volver
          </Link>
        }
      />
      <div className="card">
        <ActionForm action={registrarAbono} submitLabel="Guardar abono">
          <Field label="Negocio (cliente · proyecto · lote)">
            <Select
              name="negocioId"
              options={negocios}
              defaultValue={searchParams.negocio || ""}
              placeholder="Selecciona el negocio"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <Input type="date" name="fecha" defaultValue={inputDate(new Date())} />
            </Field>
            <Field label="Monto (US$)">
              <Input name="monto" inputMode="decimal" placeholder="100" required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select name="tipo" options={TIPOS_ABONO} defaultValue="cuota" />
            </Field>
            <Field label="Método">
              <Select name="metodo" options={METODOS_PAGO} defaultValue="efectivo" />
            </Field>
          </div>
          <Field label="Referencia (opcional)" hint="No. de recibo o transferencia">
            <Input name="referencia" placeholder="Ej. Recibo 0012" />
          </Field>
        </ActionForm>
      </div>
    </div>
  );
}
