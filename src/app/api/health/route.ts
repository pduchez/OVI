import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/permissions";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

/** Oculta credenciales de cualquier URL que aparezca en un mensaje de error. */
function sanitize(msg: string): string {
  return (msg || "")
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+@/gi, "$1****@")
    .slice(0, 400);
}

/** Comparación en tiempo constante del token de diagnóstico. */
function tokenValido(dado: string | null): boolean {
  const esperado = process.env.HEALTH_TOKEN || "";
  if (!esperado || esperado.length < 16 || !dado) return false;
  const a = Buffer.from(dado);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Diagnóstico de conexión.
 *
 * En PÚBLICO devuelve solo tres booleanos: lo justo para saber si el sistema
 * está en pie. El detalle —mensajes de error de la base, tipo de conexión,
 * número de usuarios— le diría a un atacante qué infraestructura hay detrás y
 * cuánta gente hay dentro, así que exige credenciales: una sesión de
 * Dirección, o `?token=` con el valor de HEALTH_TOKEN, que es la vía que sirve
 * cuando nadie puede entrar precisamente porque la base está caída.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const conToken = tokenValido(url.searchParams.get("token"));
  let esDirector = false;
  if (!conToken) {
    try {
      const user = await getCurrentUser();
      if (user) esDirector = (await getScope(user)).isDirector;
    } catch {
      esDirector = false; // la base puede estar caída: es justo lo que se diagnostica
    }
  }
  const detalle = conToken || esDirector;

  const hasEnv = Boolean(process.env.DATABASE_URL);
  const result: Record<string, unknown> = {
    ok: false,
    hasEnv,
    canConnect: false,
    tablesReady: false,
  };
  /** Añade un campo solo si quien pregunta tiene derecho al detalle. */
  const conf = (k: string, v: unknown) => {
    if (detalle) result[k] = v;
  };

  if (!hasEnv) {
    conf(
      "hint",
      "DATABASE_URL no está definida. Agrégala en Vercel → Settings → Environment Variables (Production, Preview y Development) y vuelve a desplegar."
    );
    return Response.json(result, { status: 500 });
  }

  const dbUrl = process.env.DATABASE_URL || "";
  conf(
    "puerto",
    dbUrl.includes(":6543")
      ? "6543 (transaction pooler)"
      : dbUrl.includes(":5432")
      ? "5432 (directa o session pooler)"
      : "desconocido"
  );
  conf("esPooler", dbUrl.includes("pooler.supabase.com"));

  try {
    await prisma.$queryRaw`SELECT 1`;
    result.canConnect = true;
  } catch (e) {
    conf("error", sanitize((e as Error)?.message));
    conf(
      "hint",
      "Conecta mal: en Supabase usa la cadena del 'Session pooler' (host aws-…pooler.supabase.com, puerto 5432) con la contraseña real."
    );
    return Response.json(result, { status: 500 });
  }

  try {
    const users = await prisma.user.count();
    result.tablesReady = true;
    conf("users", users);
    result.ok = true;
  } catch (e) {
    conf("tableError", sanitize((e as Error)?.message));
    conf(
      "hint",
      "Conecta, pero faltan las tablas: el build no pudo correr 'prisma db push'. Usa el 'Session pooler' (5432) y vuelve a desplegar."
    );
    return Response.json(result, { status: 500 });
  }

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
