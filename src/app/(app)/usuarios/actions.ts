"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import { logSecurity } from "@/lib/securityLog";

/** Guardia: solo director/gerente/asistente administran usuarios. */
async function guardUsers() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = await getScope(user);
  if (!scope.canManageUsers) throw new Error("No puedes administrar usuarios.");
  return { user, scope };
}

/** ¿El administrador puede tocar a un usuario de esta fuerza? */
function puedeSobreFuerza(scope: { manageFuerza: string | null }, fuerza: string) {
  if (scope.manageFuerza === null) return true; // director
  return fuerza === scope.manageFuerza;
}

export async function guardarUsuarioGestion(_prev: unknown, fd: FormData) {
  const { user, scope } = await guardUsers();
  const id = String(fd.get("id") || "");
  const username = String(fd.get("username") || "").trim().toLowerCase();
  const displayName = String(fd.get("displayName") || "").trim();
  const email = String(fd.get("email") || "").trim();
  const phone = String(fd.get("phone") || "").trim();
  let role = String(fd.get("role") || "vendedor");
  let fuerza = String(fd.get("fuerza") || "interna");
  const supervisorId = String(fd.get("supervisorId") || "") || null;
  const password = String(fd.get("password") || "");
  const projectIds = fd.getAll("projectIds").map(String).filter(Boolean);

  if (!username) return { error: "El usuario (para ingresar) es obligatorio." };
  if (!displayName) return { error: "El nombre de la persona es obligatorio." };

  // Restricciones para gerente/asistente (no director):
  if (scope.manageFuerza !== null) {
    fuerza = scope.manageFuerza; // solo su fuerza
    if (!["asistente", "vendedor"].includes(role)) role = "vendedor";
  }
  if (!puedeSobreFuerza(scope, fuerza)) {
    return { error: "No puedes administrar usuarios de otra fuerza de ventas." };
  }

  try {
    let targetId = id;
    if (id) {
      const prev = await prisma.user.findUnique({ where: { id } });
      if (!prev) return { error: "Usuario no encontrado." };
      if (!puedeSobreFuerza(scope, prev.fuerza)) {
        return { error: "No puedes editar a un usuario de otra fuerza." };
      }
      await prisma.user.update({
        where: { id },
        data: {
          username, displayName, email, phone, role, fuerza, supervisorId,
          ...(password ? { passwordHash: hashPassword(password), mustChangePassword: true } : {}),
        },
      });
    } else {
      const created = await prisma.user.create({
        data: {
          username, displayName, email, phone, role, fuerza, supervisorId,
          passwordHash: hashPassword(password || "password"),
          mustChangePassword: true,
        },
      });
      targetId = created.id;
    }

    // Reasigna proyectos (para vendedores).
    await prisma.projectAssignment.deleteMany({ where: { userId: targetId } });
    if (["vendedor", "lider_sitio", "lider_central"].includes(role)) {
      for (const pid of projectIds) {
        await prisma.projectAssignment.create({ data: { userId: targetId, projectId: pid } });
      }
    }
    await logSecurity(
      user,
      id ? "usuario_editar" : "usuario_alta",
      `${id ? "Editó" : "Creó"} usuario ${username} (${displayName}) · ${role}/${fuerza}`
    );
  } catch {
    return { error: "El usuario ya existe o hubo un error al guardar." };
  }
  revalidatePath("/usuarios");
  redirect("/usuarios?ok=1");
}

export async function resetPasswordUsuario(fd: FormData) {
  const { user, scope } = await guardUsers();
  const id = String(fd.get("id") || "");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || !puedeSobreFuerza(scope, target.fuerza)) return;
  await prisma.user.update({
    where: { id },
    data: { passwordHash: hashPassword("password"), mustChangePassword: true },
  });
  await logSecurity(user, "usuario_reset_pass", `Restableció contraseña de ${target.username}`);
  revalidatePath("/usuarios");
}

export async function toggleActivoUsuario(fd: FormData) {
  const { user, scope } = await guardUsers();
  const id = String(fd.get("id") || "");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || !puedeSobreFuerza(scope, target.fuerza)) return;
  await prisma.user.update({ where: { id }, data: { activo: !target.activo } });
  await logSecurity(
    user,
    "usuario_estado",
    `${target.activo ? "Desactivó" : "Activó"} usuario ${target.username}`
  );
  revalidatePath("/usuarios");
}
