/**
 * Por qué vive aquí y no dentro del ingreso: la prueba tiene que ejercitar
 * ESTA función, no una copia suya. Una copia pasa la prueba y falla en
 * producción, que es exactamente el tipo de error que esto viene a arreglar.
 */
/**
 * Traduce un fallo de base de datos a algo que se pueda ACTUAR.
 *
 * El mensaje anterior era uno solo —«revisa DATABASE_URL en Vercel»— y salía
 * pasara lo que pasara: con la cadena perfecta, con la base en pausa, con una
 * tabla faltante o con un error nuestro en el arranque. Mandaba a Gerencia a
 * cambiar justo lo único que no estaba roto.
 *
 * OJO con cómo se distingue: cuando Prisma no logra ni abrir la conexión lanza
 * un `PrismaClientInitializationError` **sin** `code` —comprobado contra un
 * Postgres real, apagado, con clave mala y con base inexistente—, así que el
 * código no sirve para esos casos y hay que mirar el texto. El `code` sí existe
 * para los errores de consulta (P2021 y compañía).
 *
 * Nunca se le enseña a la persona el mensaje crudo de Prisma: lleva el host y
 * el puerto de la base.
 */
export function motivoDeBase(e: unknown): string {
  if (!process.env.DATABASE_URL) {
    return "Falta DATABASE_URL en Vercel: agrégala en Settings → Environment Variables y vuelve a desplegar.";
  }
  const err = e as { code?: string; errorCode?: string; name?: string; message?: string };
  const code = err?.code || err?.errorCode || "";
  const msg = String(err?.message || "");

  if (code === "P1001" || code === "P1002" || /can'?t reach database server/i.test(msg)) {
    return "La base de datos no responde. Lo más común es que el proyecto de Supabase esté EN PAUSA: entra al panel de Supabase y pulsa «Restore project». (P1001)";
  }
  if (code === "P1000" || /denied access|authentication failed/i.test(msg)) {
    return "La base rechazó las credenciales. Si se rotó la contraseña en Supabase, actualiza DATABASE_URL en Vercel. (P1000)";
  }
  if (/does not exist/i.test(msg) && /database/i.test(msg)) {
    return "La base de datos que apunta DATABASE_URL ya no existe. Revísala en Supabase. (P1003)";
  }
  if (code === "P1017" || /server has closed the connection/i.test(msg)) {
    return "La base cerró la conexión. Si se repite, revisa el estado de Supabase. (P1017)";
  }
  if (code === "P2021" || code === "P2022") {
    return `La base responde pero le faltan tablas: el despliegue no pudo correr «prisma db push». (${code})`;
  }
  if (err?.name === "PrismaClientInitializationError") {
    return "No se pudo abrir la conexión con la base de datos. Revisa en Supabase que el proyecto esté activo.";
  }
  return `No se pudo usar la base de datos${code ? ` (${code})` : ""}. Abre /api/health para ver el detalle.`;
}
