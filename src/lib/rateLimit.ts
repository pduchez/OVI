/**
 * Limitador de intentos de ingreso — anti fuerza bruta.
 *
 * Vive en la BASE DE DATOS, no en memoria. En Vercel cada petición puede caer
 * en un proceso distinto y con un contador en memoria el atacante solo tiene
 * que reintentar hasta que le toque una instancia nueva: no frena nada.
 *
 * Se limita por DOS ejes a la vez:
 *  - por usuario  → frena adivinar la contraseña de una persona concreta.
 *  - por IP       → frena el "rociado" (probar `password` contra los 47 usuarios).
 */
import { prisma } from "@/lib/db";

const MAX_FALLOS_USUARIO = 5;
const MAX_FALLOS_IP = 20; // más holgado: una oficina comparte IP
const VENTANA_MS = 15 * 60 * 1000;
const BLOQUEO_MS = 15 * 60 * 1000;

export function claveUsuario(username: string): string {
  return `u:${username.trim().toLowerCase().slice(0, 100)}`;
}
export function claveIp(ip: string): string {
  return `ip:${ip.slice(0, 60)}`;
}

/** Segundos que faltan para poder reintentar (0 = libre). */
export async function bloqueoRestante(claves: string[]): Promise<number> {
  const ahora = new Date();
  const filas = await prisma.loginAttempt.findMany({
    where: { clave: { in: claves }, bloqueadoHasta: { gt: ahora } },
    select: { bloqueadoHasta: true },
  });
  let max = 0;
  for (const f of filas) {
    if (!f.bloqueadoHasta) continue;
    max = Math.max(max, Math.ceil((f.bloqueadoHasta.getTime() - ahora.getTime()) / 1000));
  }
  return max;
}

async function sumarFallo(clave: string, maximo: number): Promise<void> {
  const ahora = new Date();
  const previo = await prisma.loginAttempt.findUnique({ where: { clave } });

  // Ventana vencida (o primer fallo): se empieza a contar de nuevo.
  if (!previo || ahora.getTime() - previo.primerFallo.getTime() > VENTANA_MS) {
    await prisma.loginAttempt.upsert({
      where: { clave },
      create: { clave, fallos: 1, primerFallo: ahora, bloqueadoHasta: null },
      update: { fallos: 1, primerFallo: ahora, bloqueadoHasta: null },
    });
    return;
  }

  const fallos = previo.fallos + 1;
  const bloquear = fallos >= maximo;
  await prisma.loginAttempt.update({
    where: { clave },
    data: {
      fallos: bloquear ? 0 : fallos,
      ...(bloquear
        ? { bloqueadoHasta: new Date(ahora.getTime() + BLOQUEO_MS), primerFallo: ahora }
        : {}),
    },
  });
}

/** Registra un fallo en ambos ejes. Nunca lanza: no debe tumbar el login. */
export async function registrarFallo(usuario: string, ip: string): Promise<void> {
  try {
    await Promise.all([
      sumarFallo(claveUsuario(usuario), MAX_FALLOS_USUARIO),
      sumarFallo(claveIp(ip), MAX_FALLOS_IP),
    ]);
  } catch {
    /* si la base falla, el login ya va a fallar por su cuenta */
  }
}

/** Limpia los contadores tras un ingreso exitoso. */
export async function limpiar(claves: string[]): Promise<void> {
  try {
    await prisma.loginAttempt.deleteMany({ where: { clave: { in: claves } } });
  } catch {
    /* no crítico */
  }
}

/** Borra cubos vencidos para que la tabla no crezca. Best-effort. */
export async function purgar(): Promise<void> {
  try {
    const limite = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.loginAttempt.deleteMany({
      where: { updatedAt: { lt: limite }, OR: [{ bloqueadoHasta: null }, { bloqueadoHasta: { lt: new Date() } }] },
    });
  } catch {
    /* no crítico */
  }
}
