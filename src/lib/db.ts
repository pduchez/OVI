import { PrismaClient } from "@prisma/client";

// Reutiliza la instancia de Prisma en desarrollo (hot-reload de Next.js).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** ¿Hay base de datos configurada? Evita romper la UI si falta DATABASE_URL. */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
