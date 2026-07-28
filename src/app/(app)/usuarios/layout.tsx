import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function UsuariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login");
  const scope = await getScope(user);
  if (!scope.canManageUsers) redirect("/");
  return <>{children}</>;
}
