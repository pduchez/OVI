import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import { projectOptions, vendedorOptions } from "@/lib/options";
import { FUERZAS, ORIGENES_VISITA } from "@/lib/constants";
import { inputDate } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { Field, Select, Input, Textarea } from "@/components/fields";
import { registrarVisita } from "../actions";

export const dynamic = "force-dynamic";

export default async function VisitaPage() {
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
        title="Registrar visita"
        subtitle="Un prospecto llegó al proyecto"
        action={
          <Link href="/registrar" className="btn-ghost no-print">
            ← Volver
          </Link>
        }
      />
      <div className="card">
        <ActionForm action={registrarVisita} submitLabel="Guardar visita">
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
            <Field label="Fecha">
              <Input type="date" name="fecha" defaultValue={inputDate(new Date())} />
            </Field>
            <Field label="Fuerza de venta">
              <Select name="fuerza" options={FUERZAS} defaultValue="interna" />
            </Field>
          </div>
          <Field label="Nombre del cliente">
            <Input name="clienteNombre" placeholder="Ej. Juan Pérez" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono">
              <Input name="clienteTelefono" inputMode="tel" placeholder="7000-0000" />
            </Field>
            <Field label="¿Cómo llegó?">
              <Select name="origen" options={ORIGENES_VISITA} defaultValue="redes" />
            </Field>
          </div>
          {vendedores.length > 0 ? (
            <Field label="Vendedor que atendió">
              <Select
                name="vendedorId"
                options={[{ value: "", label: "— Sin asignar —" }, ...vendedores]}
              />
            </Field>
          ) : null}
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" name="interesado" defaultChecked className="h-5 w-5" />
            Mostró interés real
          </label>
          <Field label="Notas (opcional)">
            <Textarea name="notas" placeholder="Qué lote le gustó, seguimiento, etc." />
          </Field>
        </ActionForm>
      </div>
    </div>
  );
}
