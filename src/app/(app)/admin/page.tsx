import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function AdminIndex() {
  await requireAdmin();
  redirect("/admin/proyectos");
}
