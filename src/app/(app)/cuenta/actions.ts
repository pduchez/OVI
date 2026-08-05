"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  AUTH_COOKIE,
  getCurrentUser,
  hashPassword,
  verifyPassword,
  validarPassword,
  signSession,
  sessionCookieOptions,
} from "@/lib/auth";
import { logSecurity } from "@/lib/securityLog";

export async function cambiarPassword(_prev: unknown, fd: FormData) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const actual = String(fd.get("actual") || "");
  const nueva = String(fd.get("nueva") || "");
  const repetir = String(fd.get("repetir") || "");

  const problema = validarPassword(nueva, session.username);
  if (problema) return { error: problema };
  if (nueva !== repetir) return { error: "La nueva contraseña y su repetición no coinciden." };

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) redirect("/login");
  if (!verifyPassword(actual, user.passwordHash)) {
    return { error: "La contraseña actual es incorrecta." };
  }
  if (verifyPassword(nueva, user.passwordHash)) {
    return { error: "La nueva contraseña debe ser distinta de la actual." };
  }

  // Al subir la generación, TODA sesión abierta con la contraseña anterior
  // deja de valer al instante — incluida la de quien la hubiera robado.
  const actualizado = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(nueva),
      mustChangePassword: false,
      sessionEpoch: { increment: 1 },
    },
  });

  // La sesión de quien acaba de cambiarla sí se renueva: no se le expulsa.
  (await cookies()).set(
    AUTH_COOKIE,
    signSession(actualizado.id, actualizado.sessionEpoch),
    sessionCookieOptions()
  );

  await logSecurity(session, "password_cambio", "Cambió su propia contraseña");
  redirect("/cuenta?ok=1");
}
