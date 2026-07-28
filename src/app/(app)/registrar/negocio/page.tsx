import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import { projectOptions, vendedorOptions } from "@/lib/options";
import { FUERZAS, METODOS_PAGO } from "@/lib/constants";
import { inputDate } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { Field, Select, Input, Textarea } from "@/components/fields";
import { registrarNegocio } from "../actions";

export const dynamic = "force-dynamic";

const TIPO_NEGOCIO = [
  { value: "reserva", label: "Reserva (apartado)" },
  { value: "venta", label: "Venta cerrada" },
];

export default async function NegocioPage() {
  const user = (await getCurrentUser())!;
  const scope = await getScope(user);
  const [proyectos, vendedores] = await Promise.all([
    projectOptions(scope),
    vendedorOptions(scope),
  ]);

  if (proyectos.length === 0) {
    return (
      <EmptyState
        title="No tienes proyectos asignados"
        hint="Pide al Director que te asigne uno o más proyectos."
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Reserva / Venta"
        subtitle="Se apartó o se vendió un lote"
        action={
          <Link href="/registrar" className="btn-ghost no-print">
            ← Volver
          </Link>
        }
      />
      <div className="card">
        <ActionForm action={registrarNegocio} submitLabel="Guardar negocio">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select name="tipo" options={TIPO_NEGOCIO} defaultValue="reserva" />
            </Field>
            <Field label="Fecha">
              <Input type="date" name="fecha" defaultValue={inputDate(new Date())} />
            </Field>
          </div>
          <Field label="Proyecto">
            <Select
              name="projectId"
              options={proyectos}
              defaultValue={proyectos.length === 1 ? proyectos[0].value : ""}
              placeholder="Selecciona el proyecto"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lote">
              <Input name="loteRef" placeholder="Ej. Lote 24" />
            </Field>
            <Field label="Fuerza de venta">
              <Select name="fuerza" options={FUERZAS} defaultValue="interna" />
            </Field>
          </div>
          <Field label="Nombre del cliente">
            <Input name="clienteNombre" placeholder="Ej. Juan Pérez" required />
          </Field>
          <Field label="Teléfono">
            <Input name="clienteTelefono" inputMode="tel" placeholder="7000-0000" />
          </Field>
          {vendedores.length > 0 ? (
            <Field label="Vendedor">
              <Select
                name="vendedorId"
                options={[{ value: "", label: "— Sin asignar —" }, ...vendedores]}
              />
            </Field>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio del lote (US$)">
              <Input name="precioLote" inputMode="decimal" placeholder="6500" />
            </Field>
            <Field label="Prima recibida (US$)" hint="Si ya pagó enganche">
              <Input name="prima" inputMode="decimal" placeholder="0" />
            </Field>
          </div>
          <Field label="Método de la prima">
            <Select name="metodo" options={METODOS_PAGO} defaultValue="efectivo" />
          </Field>
          <Field label="Notas (opcional)">
            <Textarea name="notas" placeholder="Plan de pago, condiciones, etc." />
          </Field>
        </ActionForm>
      </div>
    </div>
  );
}
