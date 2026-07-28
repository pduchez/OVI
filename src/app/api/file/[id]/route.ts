import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Sirve un archivo guardado en la base (boleta o documento). Requiere sesión. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return new Response("No autorizado", { status: 401 });

  const file = await prisma.storedFile.findUnique({ where: { id: params.id } });
  if (!file) return new Response("No encontrado", { status: 404 });

  const body = new Uint8Array(file.bytes as unknown as Buffer);
  return new Response(body, {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${file.nombre || "archivo"}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
