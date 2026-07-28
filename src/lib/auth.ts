/**
 * Autenticación y sesión de OVI.
 * - Contraseñas con scrypt (sal + hash).
 * - Sesión en cookie firmada con HMAC (userId.exp.mac). Sin dependencias externas.
 * - 4 roles: director | gerente | lider_central | lider_sitio.
 */
import { cookies } from "next/headers";
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { prisma } from "@/lib/db";

export const AUTH_COOKIE = "ovi_auth";

export type Role = string;

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  fuerza: string; // interna | ucoes | destino | ambas
  mustChangePassword: boolean;
}

// --- Hash de contraseñas -------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

// --- Sesión firmada ------------------------------------------------------

/**
 * Secreto de firma de sesión. En PRODUCCIÓN es obligatorio y debe ser largo:
 * si faltara, cualquiera que conociera el valor por defecto podría FORJAR una
 * sesión de director. Por eso aquí se falla cerrado (no se degrada a un valor
 * conocido) y solo se permite un secreto de desarrollo fuera de producción.
 */
function sessionSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET no configurado (o menor a 32 caracteres). Defínelo en las variables de entorno."
    );
  }
  return "ovi-dev-secret-solo-para-desarrollo-local-0123456789";
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 h

/**
 * Opciones de la cookie de sesión. `secure` en producción (solo viaja por
 * HTTPS), httpOnly (JavaScript no puede leerla → mitiga robo por XSS) y
 * sameSite lax (mitiga CSRF). Sin `maxAge`: se borra al cerrar el navegador;
 * la vigencia real va firmada dentro del token.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function signSession(userId: string, ttlMs = SESSION_TTL_MS): string {
  const exp = Date.now() + ttlMs;
  const payload = `${userId}.${exp}`;
  const mac = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, expStr, mac] = parts;
  const payload = `${id}.${expStr}`;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  if (mac.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  if (!Number(expStr) || Date.now() > Number(expStr)) return null;
  return id;
}

// --- Usuario actual ------------------------------------------------------

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const id = verifySession(token);
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !user.activo) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role,
    fuerza: user.fuerza,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function findUserByUsername(username: string) {
  return prisma.user.findFirst({
    where: { username: { equals: username.trim(), mode: "insensitive" } },
  });
}
