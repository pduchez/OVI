import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Latido: mantiene viva la base de datos.
 *
 * Supabase PAUSA los proyectos del plan gratuito que pasan una semana con poca
 * actividad, y un proyecto pausado rechaza toda conexión. Ya ocurrió una vez y
 * dejó a toda la fuerza de ventas sin OVI. Esta ruta la toca una vez al día
 * —desde la tarea programada de `vercel.json`— para que no la vea inactiva.
 *
 * Hace consultas REALES a las tablas, no un `SELECT 1`: lo que Supabase mide es
 * actividad de usuario sobre la base, y un ping vacío podría no contar.
 *
 * No devuelve ningún número. Cuántos usuarios o cuántos lotes hay le diría a
 * cualquiera el tamaño de la operación, y esta ruta es pública por necesidad:
 * la tarea programada tiene que poder llamarla.
 *
 * Esto REDUCE el riesgo, no lo elimina: Supabase no publica cuánta actividad
 * considera suficiente. Lo único que lo cierra del todo es un plan de pago,
 * que no se pausa nunca.
 */
export async function GET(req: Request) {
  // Si hay CRON_SECRET definido en Vercel, se exige; si no, la ruta queda
  // abierta para que funcione sin configurar nada. Vercel manda el secreto
  // solo, en la cabecera Authorization, cuando la variable existe.
  const secreto = process.env.CRON_SECRET;
  if (secreto) {
    const esVercel = req.headers.get("x-vercel-cron") !== null;
    const autorizado = req.headers.get("authorization") === `Bearer ${secreto}`;
    if (!esVercel && !autorizado) {
      return new Response("No autorizado", { status: 401 });
    }
  }

  try {
    // Lecturas baratas sobre las tablas que de verdad usa la aplicación.
    await prisma.user.count();
    await prisma.project.count();
    await prisma.lote.count();
    return Response.json(
      { ok: true, ts: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    // Sin detalle: si la base está caída, esta ruta no es el lugar para
    // contarlo. Para diagnosticar está /api/health.
    return Response.json({ ok: false }, { status: 503 });
  }
}
