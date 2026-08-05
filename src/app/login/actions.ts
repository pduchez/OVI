"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  AUTH_COOKIE,
  findUserByUsername,
  verifyPassword,
  necesitaRehash,
  hashPassword,
  quemarTiempoDeVerificacion,
  signSession,
  sessionCookieOptions,
} from "@/lib/auth";
import { ensureBootstrap } from "@/lib/bootstrap";
import { bloqueoRestante, registrarFallo, limpiar, claveUsuario, claveIp, purgar } from "@/lib/rateLimit";

/**
 * IP real del cliente.
 *
 * OJO: `x-forwarded-for` lo puede escribir quien envía la petición, así que
 * tomar su primer valor permitiría a un atacante inventarse una IP distinta en
 * cada intento y saltarse el limitador. Se prefieren las cabeceras que pone la
 * propia plataforma (Vercel) y que el cliente no puede falsificar.
 */
async function clientIp(): Promise<string> {
  const h = await headers();
  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  // Último recurso: el valor MÁS A LA DERECHA, que es el que añade el proxy
  // más cercano a nosotros; los de la izquierda los pudo poner el cliente.
  const fwd = h.get("x-forwarded-for") || "";
  const partes = fwd.split(",").map((p) => p.trim()).filter(Boolean);
  return partes.length ? partes[partes.length - 1] : "desconocida";
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const username = String(formData.get("username") || "").trim().slice(0, 100);
  const password = String(formData.get("password") || "");
  if (!username || !password) {
    return { error: "Ingresa usuario y contraseña." };
  }

  try {
    await ensureBootstrap();
  } catch {
    return {
      error:
        "No se pudo conectar a la base de datos. Revisa DATABASE_URL en Vercel (usa la cadena del 'Session pooler' de Supabase).",
    };
  }

  const ip = await clientIp();
  const claves = [claveUsuario(username), claveIp(ip)];

  // Anti fuerza bruta: bloquea por usuario y por IP.
  const espera = await bloqueoRestante(claves);
  if (espera > 0) {
    const min = Math.ceil(espera / 60);
    return {
      error: `Demasiados intentos fallidos. Intenta de nuevo en ${min} minuto(s).`,
    };
  }

  const user = await findUserByUsername(username);

  // Si el usuario no existe se hace igualmente el trabajo de un scrypt: sin
  // esto la respuesta vuelve mucho antes y se puede averiguar qué usuarios
  // existen solo midiendo el tiempo.
  if (!user) quemarTiempoDeVerificacion();

  const ok = Boolean(user) && user!.activo && verifyPassword(password, user!.passwordHash);
  if (!ok) {
    await registrarFallo(username, ip);
    // Mensaje genérico: no revela si el usuario existe o está inactivo.
    return { error: "Usuario o contraseña incorrectos." };
  }

  await limpiar(claves);
  void purgar(); // limpieza perezosa de cubos viejos

  // Si el hash venía con el coste antiguo, se actualiza ahora que tenemos la
  // contraseña en claro. Es transparente para la persona.
  if (necesitaRehash(user!.passwordHash)) {
    await prisma.user
      .update({ where: { id: user!.id }, data: { passwordHash: hashPassword(password) } })
      .catch(() => null);
  }

  (await cookies()).set(
    AUTH_COOKIE,
    signSession(user!.id, user!.sessionEpoch),
    sessionCookieOptions()
  );
  // Si tiene contraseña inicial, va directo a cambiarla.
  redirect(user!.mustChangePassword ? "/cuenta" : "/");
}

export async function logoutAction() {
  (await cookies()).delete(AUTH_COOKIE);
  redirect("/login");
}
