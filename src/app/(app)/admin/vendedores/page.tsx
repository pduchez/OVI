import Link from "next/link";
import { prisma } from "@/lib/db";
import { FUERZAS, fuerzaCorta } from "@/lib/constants";
import { PageHeader, Badge } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { Field, Select, Input } from "@/components/fields";
import { guardarVendedor } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminVendedores({
  searchParams,
}: {
  searchParams: { edit?: string; ok?: string };
}) {
  const vendedores = await prisma.vendedor.findMany({ orderBy: { nombre: "asc" } });
  const editing = searchParams.edit
    ? vendedores.find((v) => v.id === searchParams.edit)
    : null;

  return (
    <div>
      <PageHeader title="Vendedores" subtitle={`${vendedores.length} vendedor(es)`} />
      {searchParams.ok ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-700">
          ✓ Vendedor guardado.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Fuerza</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="font-medium">{v.nombre}</td>
                  <td><Badge value={v.fuerza} label={fuerzaCorta(v.fuerza)} /></td>
                  <td className="text-slate-500">{v.telefono || "—"}</td>
                  <td>{v.activo ? <Badge value="activo" label="Activo" /> : <Badge value="cerrado" label="Inactivo" />}</td>
                  <td>
                    <Link href={`/admin/vendedores?edit=${v.id}`} className="text-sm font-semibold text-ovi-primary">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card h-fit">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ovi-ink">{editing ? "Editar vendedor" : "Nuevo vendedor"}</h2>
            {editing ? (
              <Link href="/admin/vendedores" className="text-sm text-slate-500">+ Nuevo</Link>
            ) : null}
          </div>
          <ActionForm
            key={editing?.id || "nuevo"}
            action={guardarVendedor}
            submitLabel={editing ? "Guardar" : "Crear vendedor"}
          >
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <Field label="Nombre">
              <Input name="nombre" defaultValue={editing?.nombre} required />
            </Field>
            <Field label="Fuerza de venta">
              <Select name="fuerza" options={FUERZAS} defaultValue={editing?.fuerza || "interna"} />
            </Field>
            <Field label="Teléfono">
              <Input name="telefono" inputMode="tel" defaultValue={editing?.telefono} />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="activo" defaultChecked={editing?.activo ?? true} className="h-5 w-5" />
              Activo
            </label>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
