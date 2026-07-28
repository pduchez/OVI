import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import { ROLE_LABEL } from "@/lib/constants";
import AppShell, { type NavItem } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login");
  const scope = await getScope(user);

  const nav: NavItem[] = [
    { href: "/", label: "Tablero", icon: "📊" },
    { href: "/registrar", label: "Registrar", icon: "➕" },
    { href: "/negocios", label: "Negocios", icon: "🤝" },
    { href: "/novedades", label: "Novedades", icon: "📌" },
    { href: "/reportes", label: "Reportes", icon: "📑" },
  ];
  if (scope.canViewInventory) {
    nav.push({ href: "/inventario", label: "Inventario", icon: "🏷️" });
  }
  if (scope.canAdmin) {
    nav.push({ href: "/admin", label: "Administración", icon: "⚙️" });
  }

  return (
    <AppShell
      nav={nav}
      displayName={user.displayName}
      roleLabel={ROLE_LABEL[user.role] || user.role}
    >
      {children}
    </AppShell>
  );
}
