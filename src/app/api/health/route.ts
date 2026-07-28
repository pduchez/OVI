import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Oculta credenciales de cualquier URL que aparezca en un mensaje de error. */
function sanitize(msg: string): string {
  return (msg || "")
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+@/gi, "$1****@")
    .slice(0, 400);
}

/**
 * Diagnóstico de conexión. Visita /api/health para saber exactamente qué falla:
 *  - hasEnv:      ¿está definida DATABASE_URL en Vercel?
 *  - canConnect:  ¿se puede abrir la conexión a Postgres?
 *  - tablesReady: ¿existen ya las tablas (prisma db push corrió)?
 */
export async function GET() {
  const hasEnv = Boolean(process.env.DATABASE_URL);
  const result: Record<string, unknown> = {
    ok: false,
    hasEnv,
    canConnect: false,
    tablesReady: false,
  };

  if (!hasEnv) {
    result.hint =
      "DATABASE_URL no está definida. En Vercel → Settings → Environment Variables agrégala (Production, Preview y Development) y vuelve a hacer Deploy.";
    return Response.json(result, { status: 500 });
  }

  // Pista sobre el tipo de cadena de Supabase (sin exponer credenciales).
  const url = process.env.DATABASE_URL || "";
  result.puerto = url.includes(":6543")
    ? "6543 (transaction pooler)"
    : url.includes(":5432")
    ? "5432 (directa o session pooler)"
    : "desconocido";
  result.esPooler = url.includes("pooler.supabase.com");

  try {
    await prisma.$queryRaw`SELECT 1`;
    result.canConnect = true;
  } catch (e) {
    result.error = sanitize((e as Error)?.message);
    result.hint =
      "Se definió DATABASE_URL pero no conecta. En Supabase usa la cadena del 'Session pooler' (host aws-…pooler.supabase.com, puerto 5432) y reemplaza [YOUR-PASSWORD] por tu contraseña real.";
    return Response.json(result, { status: 500 });
  }

  try {
    const users = await prisma.user.count();
    result.tablesReady = true;
    result.users = users;
    result.ok = true;
  } catch (e) {
    result.tableError = sanitize((e as Error)?.message);
    result.hint =
      "Conecta, pero las tablas no existen. El build no pudo correr 'prisma db push' (suele pasar con el transaction pooler 6543). Usa la cadena del 'Session pooler' (5432) y vuelve a hacer Deploy.";
    return Response.json(result, { status: 500 });
  }

  return Response.json(result);
}
