"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { getScope } from "@/lib/permissions";

async function guardAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = await getScope(user);
  if (!scope.canAdmin) throw new Error("Solo el Director puede administrar.");
  return user;
}

function num(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v || "0").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

// --- Proyectos -----------------------------------------------------------
export async function guardarProyecto(_prev: unknown, fd: FormData) {
  await guardAdmin();
  const id = String(fd.get("id") || "");
  const data = {
    codigo: String(fd.get("codigo") || "").trim(),
    nombre: String(fd.get("nombre") || "").trim(),
    departamento: String(fd.get("departamento") || "").trim(),
    municipio: String(fd.get("municipio") || "").trim(),
    fuerza: String(fd.get("fuerza") || "ambas"),
    totalLotes: Math.round(num(fd.get("totalLotes"))),
    precioDesde: num(fd.get("precioDesde")),
    estado: String(fd.get("estado") || "activo"),
    notas: String(fd.get("notas") || "").trim(),
  };
  if (!data.codigo || !data.nombre) {
    return { error: "Código y nombre son obligatorios." };
  }
  try {
    if (id) {
      await prisma.project.update({ where: { id }, data });
    } else {
      await prisma.project.create({ data });
    }
  } catch {
    return { error: "El código ya existe. Usa uno distinto." };
  }
  revalidatePath("/admin/proyectos");
  redirect("/admin/proyectos?ok=1");
}

// --- Vendedores ----------------------------------------------------------
export async function guardarVendedor(_prev: unknown, fd: FormData) {
  await guardAdmin();
  const id = String(fd.get("id") || "");
  const data = {
    nombre: String(fd.get("nombre") || "").trim(),
    fuerza: String(fd.get("fuerza") || "interna"),
    telefono: String(fd.get("telefono") || "").trim(),
    activo: fd.get("activo") === "on",
  };
  if (!data.nombre) return { error: "El nombre es obligatorio." };
  if (id) await prisma.vendedor.update({ where: { id }, data });
  else await prisma.vendedor.create({ data });
  revalidatePath("/admin/vendedores");
  redirect("/admin/vendedores?ok=1");
}

// --- Usuarios ------------------------------------------------------------
export async function guardarUsuario(_prev: unknown, fd: FormData) {
  await guardAdmin();
  const id = String(fd.get("id") || "");
  const username = String(fd.get("username") || "").trim().toLowerCase();
  const role = String(fd.get("role") || "lider_sitio");
  const displayName = String(fd.get("displayName") || "").trim();
  const fuerza = String(fd.get("fuerza") || "ambas");
  const phone = String(fd.get("phone") || "").trim();
  const password = String(fd.get("password") || "");
  const projectIds = fd.getAll("projectIds").map(String).filter(Boolean);

  if (!username) return { error: "El usuario es obligatorio." };

  try {
    let userId = id;
    if (id) {
      await prisma.user.update({
        where: { id },
        data: {
          username,
          role,
          displayName,
          fuerza,
          phone,
          ...(password ? { passwordHash: hashPassword(password) } : {}),
        },
      });
    } else {
      const created = await prisma.user.create({
        data: {
          username,
          role,
          displayName,
          fuerza,
          phone,
          passwordHash: hashPassword(password || "password"),
        },
      });
      userId = created.id;
    }

    // Reasigna proyectos (para líderes).
    await prisma.projectAssignment.deleteMany({ where: { userId } });
    if (role === "lider_sitio" || role === "lider_central") {
      for (const pid of projectIds) {
        await prisma.projectAssignment.create({ data: { userId, projectId: pid } });
      }
    }
  } catch {
    return { error: "El usuario ya existe o hubo un error." };
  }
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?ok=1");
}

export async function toggleUsuario(fd: FormData) {
  await guardAdmin();
  const id = String(fd.get("id") || "");
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return;
  await prisma.user.update({ where: { id }, data: { activo: !u.activo } });
  revalidatePath("/admin/usuarios");
}
