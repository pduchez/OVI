"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function cambiarPassword(_prev: unknown, fd: FormData) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const actual = String(fd.get("actual") || "");
  const nueva = String(fd.get("nueva") || "");
  const repetir = String(fd.get("repetir") || "");

  if (nueva.length < 6) return { error: "La nueva contraseña debe tener al menos 6 caracteres." };
  if (nueva !== repetir) return { error: "La nueva contraseña y su repetición no coinciden." };

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) redirect("/login");
  if (!verifyPassword(actual, user.passwordHash)) {
    return { error: "La contraseña actual es incorrecta." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(nueva), mustChangePassword: false },
  });
  redirect("/cuenta?ok=1");
}
