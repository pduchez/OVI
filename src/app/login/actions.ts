"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE,
  findUserByUsername,
  verifyPassword,
  signSession,
} from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";

export async function loginAction(_prev: unknown, formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  if (!username || !password) {
    return { error: "Ingresa usuario y contraseña." };
  }
  try {
    await ensureBootstrap();
  } catch {
    return {
      error:
        "No se pudo conectar a la base de datos. Abre /api/health para ver el detalle y revisa DATABASE_URL en Vercel (usa la cadena del 'Session pooler' de Supabase).",
    };
  }
  const user = await findUserByUsername(username);
  if (!user || !user.activo || !verifyPassword(password, user.passwordHash)) {
    return { error: "Usuario o contraseña incorrectos." };
  }
  cookies().set(AUTH_COOKIE, signSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  // Si tiene contraseña inicial, va directo a cambiarla.
  redirect(user.mustChangePassword ? "/cuenta" : "/");
}

export async function logoutAction() {
  cookies().delete(AUTH_COOKIE);
  redirect("/login");
}
