import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import { negocioOptions } from "@/lib/options";
import { PageHeader, EmptyState } from "@/components/ui";
import AbonoForm from "@/components/AbonoForm";

export const dynamic = "force-dynamic";

export default async function AbonoPage({
  searchParams,
}: {
  searchParams: Promise<{ negocio?: string }>;
}) {
  const sp = await searchParams;
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
        <AbonoForm negocios={negocios} negocioSel={sp.negocio} />
      </div>
    </div>
  );
}
