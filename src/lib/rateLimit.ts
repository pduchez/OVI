/**
 * Limitador de intentos en memoria (anti fuerza bruta en el login).
 *
 * Guarda los intentos fallidos por clave (usuario + IP) en el proceso. Es
 * suficiente para frenar un ataque automatizado; si en el futuro se escala a
 * muchas instancias, conviene moverlo a la base de datos o a un Redis.
 */
type Bucket = { fails: number; blockedUntil: number; first: number };

const buckets = new Map<string, Bucket>();

const MAX_FAILS = 5; // intentos fallidos permitidos
const WINDOW_MS = 15 * 60 * 1000; // ventana de conteo (15 min)
const BLOCK_MS = 15 * 60 * 1000; // bloqueo tras superar el máximo

/** Limpieza perezosa para que el mapa no crezca sin límite. */
function prune(now: number) {
  if (buckets.size < 500) return;
  for (const [k, b] of buckets) {
    if (now > b.blockedUntil && now - b.first > WINDOW_MS) buckets.delete(k);
  }
}

/** ¿Está bloqueada esta clave? Devuelve los segundos restantes (0 = libre). */
export function bloqueoRestante(key: string): number {
  const b = buckets.get(key);
  if (!b) return 0;
  const now = Date.now();
  if (now < b.blockedUntil) return Math.ceil((b.blockedUntil - now) / 1000);
  return 0;
}

/** Registra un intento fallido y bloquea si se supera el máximo. */
export function registrarFallo(key: string): void {
  const now = Date.now();
  prune(now);
  const b = buckets.get(key);
  if (!b || now - b.first > WINDOW_MS) {
    buckets.set(key, { fails: 1, blockedUntil: 0, first: now });
    return;
  }
  b.fails += 1;
  if (b.fails >= MAX_FAILS) {
    b.blockedUntil = now + BLOCK_MS;
    b.fails = 0;
    b.first = now;
  }
}

/** Limpia el contador tras un ingreso exitoso. */
export function limpiar(key: string): void {
  buckets.delete(key);
}
