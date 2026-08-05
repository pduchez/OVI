/**
 * Blindaje de la base de datos. Idempotente: corre en cada despliegue,
 * después de `prisma db push`.
 *
 * EL PROBLEMA QUE RESUELVE
 * Supabase publica el esquema `public` a través de su API REST (PostgREST)
 * usando la llave "anon", que por diseño es pública —va dentro de cualquier
 * cliente—. Las tablas que crea Prisma nacen SIN Row Level Security y, con los
 * permisos por defecto de Supabase, los roles `anon` y `authenticated` pueden
 * leerlas y escribirlas. Es decir: sin esto, cualquiera con la URL del
 * proyecto podría leer los negocios, los usuarios y las boletas por HTTP, sin
 * pasar jamás por OVI ni por su login.
 *
 * QUÉ HACE
 *  1. Activa RLS en todas las tablas del esquema `public`, SIN políticas.
 *     Sin políticas, PostgREST no devuelve ni una fila a `anon`.
 *  2. Revoca los permisos de `anon` y `authenticated` sobre el esquema y sus
 *     tablas, y sobre las que se creen en el futuro. Es el cinturón además
 *     del tirante: aunque alguien desactivara RLS por error, no habría permiso.
 *
 * POR QUÉ NO ROMPE OVI
 * OVI no usa la API REST de Supabase: se conecta directo a Postgres con el
 * rol dueño de las tablas, y el dueño NO está sujeto a RLS (eso solo pasaría
 * con FORCE ROW LEVEL SECURITY, que deliberadamente no se activa).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Ejecuta una sentencia y reporta, sin tumbar el despliegue. */
async function paso(descripcion, sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`  ✓ ${descripcion}`);
    return true;
  } catch (e) {
    console.log(`  ! ${descripcion}: ${String(e.message || e).split("\n")[0]}`);
    return false;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("[harden-db] Sin DATABASE_URL: nada que blindar.");
    return;
  }
  console.log("[harden-db] Blindando el esquema public…");

  // 1. RLS en todas las tablas del esquema public (sin políticas = nadie pasa
  //    por la API REST; el dueño de la tabla sigue entrando sin problema).
  await paso(
    "RLS activado en todas las tablas de public",
    `DO $$
     DECLARE t record;
     BEGIN
       FOR t IN
         SELECT c.relname
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'r'
       LOOP
         EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
       END LOOP;
     END $$;`
  );

  // 2. Quitar todo permiso a los roles públicos de Supabase, si existen.
  //    (En una Postgres que no sea Supabase estos roles no existen y el
  //    bloque simplemente no hace nada.)
  await paso(
    "permisos de anon/authenticated revocados",
    `DO $$
     DECLARE r text;
     BEGIN
       FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
         IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
           EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
           EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
           EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
           EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', r);
           EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
           EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
           EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
         END IF;
       END LOOP;
     END $$;`
  );

  // 3. Verificación: si quedara una tabla sin RLS, se dice en voz alta.
  try {
    const sinRls = await prisma.$queryRawUnsafe(
      `SELECT c.relname::text AS tabla
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false`
    );
    if (Array.isArray(sinRls) && sinRls.length) {
      console.log(`  ! ATENCIÓN: sin RLS → ${sinRls.map((r) => r.tabla).join(", ")}`);
    } else {
      console.log("  ✓ verificado: ninguna tabla de public quedó sin RLS");
    }
  } catch (e) {
    console.log(`  ! no se pudo verificar: ${String(e.message || e).split("\n")[0]}`);
  }
}

main()
  .catch((e) => {
    // Nunca romper el despliegue por esto: si falla, queda el aviso en el log.
    console.log("[harden-db] no se pudo completar:", String(e.message || e).split("\n")[0]);
  })
  .finally(() => prisma.$disconnect());
