import { PrismaClient } from "@prisma/client";

// Reutiliza la instancia de Prisma en desarrollo (hot-reload de Next.js).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * En serverless (Vercel) + pooler de Supabase, Prisma puede agotar el pool de
 * conexiones y lanzar excepciones intermitentes. Forzamos un límite bajo de
 * conexiones y un timeout de pool más amplio añadiéndolos a la cadena, salvo
 * que ya vengan definidos.
 */
function resilientUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (!u.searchParams.has("connection_limit"))
      u.searchParams.set("connection_limit", "1");
    if (!u.searchParams.has("pool_timeout"))
      u.searchParams.set("pool_timeout", "20");
    // El pooler de Supabase en modo transacción requiere pgbouncer=true.
    if (u.port === "6543" && !u.searchParams.has("pgbouncer"))
      u.searchParams.set("pgbouncer", "true");
    return u.toString();
  } catch {
    return raw;
  }
}

function createClient() {
  const url = resilientUrl();
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** ¿Hay base de datos configurada? Evita romper la UI si falta DATABASE_URL. */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
