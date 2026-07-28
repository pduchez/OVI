import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function InventarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login");
  const scope = await getScope(user);
  // Gerentes/dirección (gestión) y fuerza DP (solo-lectura).
  if (!scope.canViewInventory) redirect("/");
  return <>{children}</>;
}
