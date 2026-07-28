import { prisma } from "@/lib/db";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB por archivo

/** Guarda un File (de un FormData) en la base y devuelve su id, o null. */
export async function storeFile(
  file: File | null,
  kind: string,
  subidoPorId?: string
): Promise<{ id: string; nombre: string; size: number } | null> {
  if (!file || typeof file.arrayBuffer !== "function") return null;
  if (!file.size) return null;
  if (file.size > MAX_BYTES) {
    throw new Error("El archivo supera el límite de 8 MB.");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const stored = await prisma.storedFile.create({
    data: {
      nombre: file.name || "archivo",
      mimeType: file.type || "application/octet-stream",
      kind,
      bytes: buf,
      size: buf.length,
      subidoPorId: subidoPorId || null,
    },
  });
  return { id: stored.id, nombre: stored.nombre, size: stored.size };
}
