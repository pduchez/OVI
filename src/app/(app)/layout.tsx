import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import { ROLE_LABEL } from "@/lib/constants";
import AppShell, { type NavItem } from "@/components/AppShell";
import InstalarOVI from "@/components/InstalarOVI";
import AlDia from "@/components/AlDia";

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
  if (scope.canManageUsers) {
    nav.push({ href: "/usuarios", label: "Usuarios", icon: "👥" });
    nav.push({ href: "/bitacora", label: "Bitácora", icon: "🛡️" });
  }
  if (scope.canAdmin) {
    nav.push({ href: "/admin", label: "Administración", icon: "⚙️" });
  }
  nav.push({ href: "/cuenta", label: "Mi cuenta", icon: "🔑" });

  return (
    <AppShell
      nav={nav}
      displayName={user.displayName}
      roleLabel={ROLE_LABEL[user.role] || user.role}
    >
      {children}
      {/* La pantalla se pone al día sola cada minuto: dos personas con OVI
          abierta nunca deben ver inventarios distintos. */}
      <AlDia />
      {/* Se ofrece la instalación sola, al entrar, con los pasos del equipo
          desde el que firmó la persona. Nadie tiene que mandarle nada. */}
      <InstalarOVI />
    </AppShell>
  );
}
