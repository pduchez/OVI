"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword, validarPassword } from "@/lib/auth";
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

/** Rango jerárquico: solo se administra a usuarios de rango INFERIOR. */
const RANGO: Record<string, number> = {
  director: 3,
  gerente: 2,
  asistente: 1,
  vendedor: 0,
  lider_central: 0,
  lider_sitio: 0,
};
function rango(role: string): number {
  return RANGO[role] ?? 0;
}

/**
 * Verifica que quien administra tenga autoridad sobre el usuario objetivo:
 * misma fuerza (salvo director) y rango estrictamente superior. Impide, por
 * ejemplo, que una asistente edite o desactive a su propio gerente, o que
 * alguien se auto-ascienda.
 */
function puedeSobreUsuario(
  actor: { role: string; id: string },
  scope: { manageFuerza: string | null },
  objetivo: { role: string; fuerza: string; id: string }
): string | null {
  if (!puedeSobreFuerza(scope, objetivo.fuerza)) {
    return "No puedes administrar usuarios de otra fuerza de ventas.";
  }
  if (actor.id === objetivo.id) {
    return "No puedes modificar tu propio usuario aquí; usa 'Mi cuenta'.";
  }
  if (rango(actor.role) <= rango(objetivo.role)) {
    return "No puedes administrar a un usuario de tu mismo nivel o superior.";
  }
  return null;
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
  if (!/^[a-z0-9._-]{3,60}$/.test(username)) {
    return { error: "El usuario solo admite letras, números, punto, guion y guion bajo (3 a 60)." };
  }
  if (!displayName) return { error: "El nombre de la persona es obligatorio." };
  // Si el administrador escribe una contraseña, debe cumplir la política.
  if (password) {
    const problema = validarPassword(password, username);
    if (problema) return { error: problema };
  }

  // Restricciones para gerente/asistente (no director):
  if (scope.manageFuerza !== null) {
    fuerza = scope.manageFuerza; // solo su fuerza
    if (!["asistente", "vendedor"].includes(role)) role = "vendedor";
  }
  if (!puedeSobreFuerza(scope, fuerza)) {
    return { error: "No puedes administrar usuarios de otra fuerza de ventas." };
  }
  // No se puede crear/asignar un rol de rango igual o superior al propio.
  if (rango(role) >= rango(user.role)) {
    return { error: "No puedes asignar un nivel igual o superior al tuyo." };
  }

  // El superior debe existir de verdad.
  if (supervisorId) {
    const jefe = await prisma.user.findUnique({ where: { id: supervisorId } });
    if (!jefe) return { error: "El superior seleccionado no existe." };
    if (id && jefe.id === id) return { error: "Un usuario no puede ser su propio superior." };
  }

  try {
    let targetId = id;
    if (id) {
      const prev = await prisma.user.findUnique({ where: { id } });
      if (!prev) return { error: "Usuario no encontrado." };
      const veto = puedeSobreUsuario(user, scope, prev);
      if (veto) return { error: veto };
      await prisma.user.update({
        where: { id },
        data: {
          username, displayName, email, phone, role, fuerza, supervisorId,
          // Cambiar la contraseña invalida las sesiones abiertas del usuario.
          ...(password
            ? {
                passwordHash: hashPassword(password),
                mustChangePassword: true,
                sessionEpoch: { increment: 1 },
              }
            : {}),
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
      // Solo ids de proyectos que existen de verdad: no se aceptan valores
      // inventados en el formulario.
      const validos = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true },
      });
      for (const p of validos) {
        await prisma.projectAssignment.create({ data: { userId: targetId, projectId: p.id } });
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
  if (!target || puedeSobreUsuario(user, scope, target)) return; // sin autoridad
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: hashPassword("password"),
      mustChangePassword: true,
      // Expulsa cualquier sesión abierta: si se restablece la contraseña es
      // porque se sospecha de ella, y la cookie robada seguiría sirviendo.
      sessionEpoch: { increment: 1 },
    },
  });
  await logSecurity(user, "usuario_reset_pass", `Restableció contraseña de ${target.username}`);
  revalidatePath("/usuarios");
}

export async function toggleActivoUsuario(fd: FormData) {
  const { user, scope } = await guardUsers();
  const id = String(fd.get("id") || "");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || puedeSobreUsuario(user, scope, target)) return; // sin autoridad
  await prisma.user.update({
    where: { id },
    data: {
      activo: !target.activo,
      // Al dar de baja, la sesión abierta deja de valer de inmediato.
      ...(target.activo ? { sessionEpoch: { increment: 1 } } : {}),
    },
  });
  await logSecurity(
    user,
    "usuario_estado",
    `${target.activo ? "Desactivó" : "Activó"} usuario ${target.username}`
  );
  revalidatePath("/usuarios");
}
