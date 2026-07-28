import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

/** Registra una acción privilegiada en la bitácora de seguridad. */
export async function logSecurity(
  user: SessionUser,
  accion: string,
  detalle: string,
  projectId = ""
): Promise<void> {
  try {
    await prisma.securityLog.create({
      data: {
        accion,
        detalle,
        projectId,
        userId: user.id,
        userName: user.displayName || user.username,
        userRole: user.role,
      },
    });
  } catch {
    // Nunca romper la operación por un fallo de logging.
  }
}
