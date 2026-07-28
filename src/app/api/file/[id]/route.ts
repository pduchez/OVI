import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getScope, canAccessProject } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Solo estos tipos se muestran en línea; el resto se descarga (nunca se ejecuta). */
const INLINE_OK = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

/**
 * Sirve un archivo guardado (boleta o documento de inventario).
 *
 * Seguridad:
 *  - Requiere sesión Y autorización sobre el objeto: no basta con adivinar el
 *    id (evita que un usuario lea las boletas de otra fuerza).
 *  - Devuelve el mimeType VERIFICADO al subir + `nosniff`, y fuerza descarga
 *    para tipos no visualizables → un archivo no puede ejecutar scripts.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return new Response("No autorizado", { status: 401 });
  const scope = await getScope(user);

  const file = await prisma.storedFile.findUnique({ where: { id: params.id } });
  if (!file) return new Response("No encontrado", { status: 404 });

  // --- Autorización por objeto ------------------------------------------
  let permitido = false;

  if (file.kind === "boleta") {
    // Debe poder ver el negocio al que pertenece el abono de esa boleta.
    const abono = await prisma.abono.findFirst({
      where: { boletaFileId: file.id },
      select: { negocio: { select: { projectId: true, fuerza: true } } },
    });
    if (abono?.negocio) {
      const enAlcance =
        canAccessProject(scope, abono.negocio.projectId) &&
        (!scope.fuerza || scope.fuerza === abono.negocio.fuerza) &&
        (!scope.excludeDestino || abono.negocio.fuerza !== "destino");
      permitido = enAlcance;
    } else {
      // Boleta sin abono asociado: solo quien la subió o la dirección.
      permitido = scope.isDirector || file.subidoPorId === user.id;
    }
  } else if (file.kind === "inventario") {
    // Documentos de inventario: quien puede ver el inventario del proyecto.
    const imp = await prisma.inventoryImport.findFirst({
      where: { fileId: file.id },
      select: { projectId: true },
    });
    permitido =
      scope.canViewInventory &&
      (!imp || canAccessProject(scope, imp.projectId));
  } else {
    permitido = scope.isDirector || file.subidoPorId === user.id;
  }

  if (!permitido) return new Response("Prohibido", { status: 403 });

  // --- Entrega segura ----------------------------------------------------
  const tipo = file.mimeType || "application/octet-stream";
  const disposition = INLINE_OK.includes(tipo) ? "inline" : "attachment";
  // Nombre saneado para la cabecera (sin comillas ni saltos de línea).
  const nombre = (file.nombre || "archivo").replace(/[\r\n"\\]/g, "_");

  const body = new Uint8Array(file.bytes as unknown as Buffer);
  return new Response(body, {
    headers: {
      "Content-Type": tipo,
      "Content-Disposition": `${disposition}; filename="${nombre}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
