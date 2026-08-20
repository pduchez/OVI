/**
 * Autenticación y sesión de OVI.
 * - Contraseñas con scrypt (sal + hash), con coste versionado.
 * - Sesión en cookie firmada con HMAC. Sin dependencias externas.
 *
 * El token de sesión lleva la GENERACIÓN del usuario (`sessionEpoch`): al
 * cambiar o restablecer una contraseña esa generación sube y toda sesión
 * previamente emitida deja de valer al instante. Sin eso, una contraseña
 * robada seguiría dando acceso hasta que caducara la cookie.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
  /** Modo piloto: frenos levantados dentro de su propio proyecto. */
  modoPiloto: boolean;
}

// --- Hash de contraseñas -------------------------------------------------

/**
 * Coste de scrypt. El valor por defecto de Node (N=16384) se quedó corto para
 * 2026; N=65536 sube el trabajo del atacante ~4× por intento y sigue siendo
 * imperceptible al ingresar. `maxmem` hay que subirlo a mano: con N alto,
 * Node rechaza la operación con el límite por defecto de 32 MB.
 */
const SCRYPT_N = 65536;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 192 * 1024 * 1024;

function scrypt(password: string, salt: string, N: number): Buffer {
  return scryptSync(password, salt, SCRYPT_KEYLEN, {
    N,
    r: SCRYPT_r,
    p: SCRYPT_p,
    maxmem: SCRYPT_MAXMEM,
  });
}

/** Formato nuevo: `scrypt$<N>$<sal>$<hash>`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scrypt(password, salt, SCRYPT_N).toString("hex");
  return `scrypt$${SCRYPT_N}$${salt}$${hash}`;
}

/**
 * Verifica contra el formato nuevo y contra el antiguo (`sal:hash`, N por
 * defecto), para no invalidar las contraseñas ya existentes.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const s = stored || "";
  let salt: string, hash: string, N: number;

  if (s.startsWith("scrypt$")) {
    const [, nStr, sal, h] = s.split("$");
    N = Number(nStr);
    salt = sal;
    hash = h;
    if (!N || !salt || !hash) return false;
  } else {
    [salt, hash] = s.split(":");
    N = 16384; // coste histórico
    if (!salt || !hash) return false;
  }

  let candidate: Buffer;
  try {
    candidate = scrypt(password, salt, N);
  } catch {
    return false;
  }
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** ¿El hash guardado usa un coste inferior al actual? (para re-hashear al entrar) */
export function necesitaRehash(stored: string): boolean {
  return !(stored || "").startsWith(`scrypt$${SCRYPT_N}$`);
}

/**
 * Trabajo equivalente a verificar una contraseña, para cuando el usuario NO
 * existe. Sin esto, la respuesta vuelve mucho más rápido y un atacante puede
 * averiguar qué usuarios existen solo midiendo el tiempo.
 */
export function quemarTiempoDeVerificacion(): void {
  try {
    scrypt("contrasena-que-no-existe", "0".repeat(32), SCRYPT_N);
  } catch {
    /* da igual: solo consume tiempo */
  }
}

// --- Política de contraseñas ---------------------------------------------

const MIN_LARGO = 10;
/** Contraseñas prohibidas por obvias (incluida la inicial que reparte OVI). */
const PROHIBIDAS = new Set([
  "password", "password1", "contrasena", "contraseña", "123456", "12345678",
  "123456789", "1234567890", "qwerty", "qwertyuiop", "admin", "administrador",
  "bienvenido", "ovi", "ovi2026", "chacon", "grupochacon",
]);

/** Valida una contraseña nueva. Devuelve el error, o null si es aceptable. */
export function validarPassword(nueva: string, username?: string): string | null {
  const p = (nueva || "").trim();
  if (p.length < MIN_LARGO) {
    return `La contraseña debe tener al menos ${MIN_LARGO} caracteres.`;
  }
  if (p.length > 200) return "La contraseña es demasiado larga.";
  const bajo = p.toLowerCase();
  if (PROHIBIDAS.has(bajo)) {
    return "Esa contraseña es demasiado común. Escoge una que nadie pueda adivinar.";
  }
  if (username && bajo.includes(username.toLowerCase().trim()) && username.length > 3) {
    return "La contraseña no puede contener tu nombre de usuario.";
  }
  if (/^(.)\1+$/.test(p)) return "La contraseña no puede ser un solo carácter repetido.";
  return null;
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

/** Token: `<userId>.<epoch>.<exp>.<mac>` */
export function signSession(userId: string, epoch: number, ttlMs = SESSION_TTL_MS): string {
  const exp = Date.now() + ttlMs;
  const payload = `${userId}.${epoch}.${exp}`;
  const mac = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

export function verifySession(token: string | undefined): { id: string; epoch: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [id, epochStr, expStr, mac] = parts;
  const payload = `${id}.${epochStr}.${expStr}`;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  if (mac.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const exp = Number(expStr);
  if (!exp || Date.now() > exp) return null;
  const epoch = Number(epochStr);
  if (!Number.isInteger(epoch) || epoch < 0) return null;
  return { id, epoch };
}

// --- Usuario actual ------------------------------------------------------

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const claim = verifySession(token);
  if (!claim) return null;
  const user = await prisma.user.findUnique({ where: { id: claim.id } });
  if (!user || !user.activo) return null;
  // La generación del token debe coincidir con la del usuario: si la
  // contraseña cambió (o un administrador la restableció), toda sesión
  // anterior queda invalidada de inmediato.
  if (user.sessionEpoch !== claim.epoch) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role,
    fuerza: user.fuerza,
    mustChangePassword: user.mustChangePassword,
    modoPiloto: user.modoPiloto,
  };
}

export async function findUserByUsername(username: string) {
  return prisma.user.findFirst({
    where: { username: { equals: username.trim(), mode: "insensitive" } },
    orderBy: { createdAt: "asc" }, // determinista si hubiera colisión de mayúsculas
  });
}

/**
 * Usuario de la sesión, o redirige al login. Se usa en las páginas privadas
 * para no asumir nunca que la sesión existe: si la sesión caducó o la base no
 * respondió, el usuario ve el login en vez de una pantalla de error.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login");
  return user;
}
