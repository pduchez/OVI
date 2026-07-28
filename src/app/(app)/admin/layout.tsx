import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const TABS = [
  { href: "/admin/proyectos", label: "Proyectos" },
  { href: "/admin/usuarios", label: "Usuarios y accesos" },
  { href: "/admin/vendedores", label: "Vendedores" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login");
  const scope = await getScope(user);
  if (!scope.canAdmin) redirect("/");

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1.5 no-print">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
