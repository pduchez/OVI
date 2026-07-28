"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE,
  findUserByUsername,
  verifyPassword,
  signSession,
  sessionCookieOptions,
} from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { bloqueoRestante, registrarFallo, limpiar } from "@/lib/rateLimit";

/** IP del cliente (a través del proxy de Vercel). */
function clientIp(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || h.get("x-real-ip") || "desconocida";
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  if (!username || !password) {
    return { error: "Ingresa usuario y contraseña." };
  }

  // Anti fuerza bruta: bloquea tras varios intentos fallidos.
  const key = `${username.toLowerCase()}|${clientIp()}`;
  const espera = bloqueoRestante(key);
  if (espera > 0) {
    const min = Math.ceil(espera / 60);
    return {
      error: `Demasiados intentos fallidos. Intenta de nuevo en ${min} minuto(s).`,
    };
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
    registrarFallo(key);
    // Mensaje genérico: no revela si el usuario existe o está inactivo.
    return { error: "Usuario o contraseña incorrectos." };
  }

  limpiar(key);
  cookies().set(AUTH_COOKIE, signSession(user.id), sessionCookieOptions());
  // Si tiene contraseña inicial, va directo a cambiarla.
  redirect(user.mustChangePassword ? "/cuenta" : "/");
}

export async function logoutAction() {
  cookies().delete(AUTH_COOKIE);
  redirect("/login");
}
