import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import { projectOptions, vendedorOptions } from "@/lib/options";
import { PageHeader, EmptyState } from "@/components/ui";
import NegocioForm from "@/components/NegocioForm";

export const dynamic = "force-dynamic";

export default async function NegocioPage() {
  const user = await requireUser();
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
        <NegocioForm
          proyectos={proyectos}
          vendedores={vendedores}
          fuerzaFija={scope.fuerzaFija}
        />
      </div>
    </div>
  );
}
