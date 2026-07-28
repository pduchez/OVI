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

export type Role = "director" | "gerente" | "lider_central" | "lider_sitio";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  fuerza: string; // interna | ucoes | ambas
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

function sessionSecret(): string {
  return process.env.AUTH_SECRET || "ovi-dev-secret-cambiar-en-produccion";
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 h

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
  const token = cookies().get(AUTH_COOKIE)?.value;
  const id = verifySession(token);
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !user.activo) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role as Role,
    fuerza: user.fuerza,
  };
}

export async function findUserByUsername(username: string) {
  return prisma.user.findFirst({
    where: { username: { equals: username.trim(), mode: "insensitive" } },
  });
}
