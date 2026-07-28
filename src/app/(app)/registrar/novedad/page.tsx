import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import { projectOptions } from "@/lib/options";
import { CATEGORIAS_NOVEDAD, PRIORIDADES } from "@/lib/constants";
import { inputDate } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { Field, Select, Input, Textarea } from "@/components/fields";
import { registrarNovedad } from "../actions";

export const dynamic = "force-dynamic";

export default async function NovedadPage() {
  const user = (await getCurrentUser())!;
  const scope = await getScope(user);
  const proyectos = await projectOptions(scope);

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
        title="Novedad / Problema"
        subtitle="Algo que reportar del proyecto"
        action={
          <Link href="/registrar" className="btn-ghost no-print">
            ← Volver
          </Link>
        }
      />
      <div className="card">
        <ActionForm action={registrarNovedad} submitLabel="Reportar novedad">
          <Field label="Proyecto">
            <Select
              name="projectId"
              options={proyectos}
              defaultValue={proyectos.length === 1 ? proyectos[0].value : ""}
              placeholder="Selecciona el proyecto"
              required
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Categoría">
              <Select name="categoria" options={CATEGORIAS_NOVEDAD} defaultValue="operativo" />
            </Field>
            <Field label="Prioridad">
              <Select name="prioridad" options={PRIORIDADES} defaultValue="media" />
            </Field>
          </div>
          <Field label="Título">
            <Input name="titulo" placeholder="Ej. Falta señalización en calle 3" required />
          </Field>
          <Field label="Detalle">
            <Textarea name="detalle" rows={4} placeholder="Describe el problema o la novedad" />
          </Field>
          <Field label="Fecha">
            <Input type="date" name="fecha" defaultValue={inputDate(new Date())} />
          </Field>
        </ActionForm>
      </div>
    </div>
  );
}
