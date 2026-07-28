import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABEL, fuerzaCorta } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { Field, Input } from "@/components/fields";
import { cambiarPassword } from "./actions";

export const dynamic = "force-dynamic";

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: { ok?: string };
}) {
  const user = (await getCurrentUser())!;
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Mi cuenta" subtitle={user.displayName} />

      <div className="card mb-4">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-500">Usuario</dt>
          <dd className="font-medium">{user.username}</dd>
          <dt className="text-slate-500">Rol</dt>
          <dd className="font-medium">{ROLE_LABEL[user.role] || user.role}</dd>
          <dt className="text-slate-500">Fuerza</dt>
          <dd className="font-medium">{fuerzaCorta(user.fuerza)}</dd>
        </dl>
      </div>

      {user.mustChangePassword ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          Por seguridad, cambia tu contraseña inicial.
        </p>
      ) : null}
      {searchParams.ok ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-700">
          ✓ Contraseña actualizada.
        </p>
      ) : null}

      <div className="card">
        <h2 className="mb-3 font-bold text-ovi-ink">Cambiar contraseña</h2>
        <ActionForm action={cambiarPassword} submitLabel="Actualizar contraseña">
          <Field label="Contraseña actual">
            <Input name="actual" type="password" required autoComplete="current-password" />
          </Field>
          <Field label="Nueva contraseña">
            <Input name="nueva" type="password" required autoComplete="new-password" />
          </Field>
          <Field label="Repetir nueva contraseña">
            <Input name="repetir" type="password" required autoComplete="new-password" />
          </Field>
        </ActionForm>
      </div>
    </div>
  );
}
