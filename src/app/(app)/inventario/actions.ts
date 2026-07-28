"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getScope, canAccessProject } from "@/lib/permissions";
import { storeFile } from "@/lib/files";
import { logSecurity } from "@/lib/securityLog";
import { parseInventoryDetallado } from "@/lib/inventory";

function money(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v || "0").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

/** Solo gerentes de ventas y directores pueden gestionar inventario/precios. */
async function guardInv(projectId?: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = await getScope(user);
  if (!scope.canManageInventory) {
    throw new Error("Solo los gerentes de ventas y la dirección pueden gestionar inventario.");
  }
  if (projectId && !canAccessProject(scope, projectId)) {
    throw new Error("No tienes acceso a este proyecto.");
  }
  return user;
}

// --- Alta / edición de un lote (precio editable SOLO aquí) ----------------
export async function guardarLote(_prev: unknown, fd: FormData) {
  const projectId = String(fd.get("projectId") || "");
  const user = await guardInv(projectId);
  const id = String(fd.get("id") || "");
  const numero = String(fd.get("numero") || "").trim();
  if (!numero) return { error: "El número de lote es obligatorio." };
  const data = {
    numero,
    area: money(fd.get("area")),
    precio: money(fd.get("precio")),
    estado: String(fd.get("estado") || "disponible"),
    notas: String(fd.get("notas") || "").trim(),
  };
  try {
    if (id) {
      const prev = await prisma.lote.findUnique({ where: { id } });
      await prisma.lote.update({ where: { id }, data });
      if (prev && prev.precio !== data.precio) {
        await logSecurity(
          user,
          "lote_precio",
          `Lote ${numero}: precio ${prev.precio} → ${data.precio}`,
          projectId
        );
      }
    } else {
      await prisma.lote.create({ data: { ...data, projectId } });
      await logSecurity(user, "lote_alta", `Lote ${numero} creado (${data.precio})`, projectId);
    }
  } catch {
    return { error: "Ese número de lote ya existe en el proyecto." };
  }
  revalidatePath(`/inventario/${projectId}`);
  redirect(`/inventario/${projectId}?ok=lote`);
}

// --- Importación de inventario (Excel / CSV) ------------------------------
export async function importarInventario(_prev: unknown, fd: FormData) {
  const projectId = String(fd.get("projectId") || "");
  const user = await guardInv(projectId);
  const file = fd.get("archivo") as File | null;
  if (!file || !file.size) return { error: "Selecciona un archivo Excel o CSV." };

  const nombre = file.name || "inventario";
  const esExcelCsv = /\.(xlsx|xls|csv)$/i.test(nombre);
  if (!esExcelCsv) {
    return { error: "Formato no soportado para importar. Usa .xlsx, .xls o .csv (el PDF se guarda como documento adjunto)." };
  }

  let rows;
  let stored;
  let hoja = "";
  let ignoradas: string[] = [];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const lectura = parseInventoryDetallado(buf, nombre);
    rows = lectura.filas;
    hoja = lectura.hoja;
    ignoradas = lectura.hojasIgnoradas;
    stored = await storeFile(file, "inventario", user.id);
  } catch (e) {
    return { error: "No se pudo leer el archivo: " + (e as Error).message };
  }
  if (!rows.length) {
    return {
      error:
        "No se encontraron lotes. El archivo debe tener una hoja con columnas de lote (o polígono + lote) y precio.",
    };
  }

  let creados = 0;
  let actualizados = 0;
  for (const r of rows) {
    const existing = await prisma.lote.findUnique({
      where: { projectId_numero: { projectId, numero: r.numero } },
    });
    if (existing) {
      // No pisar el estado si el lote ya está reservado/vendido.
      const estado = ["reservado", "vendido"].includes(existing.estado)
        ? existing.estado
        : r.estado;
      await prisma.lote.update({
        where: { id: existing.id },
        data: { area: r.area, precio: r.precio, estado, notas: r.notas },
      });
      actualizados++;
    } else {
      await prisma.lote.create({ data: { ...r, projectId } });
      creados++;
    }
  }

  await prisma.inventoryImport.create({
    data: {
      projectId,
      fileId: stored?.id || null,
      formato: /\.csv$/i.test(nombre) ? "csv" : "excel",
      filas: rows.length,
      creados,
      actualizados,
      userId: user.id,
      userName: user.displayName || user.username,
    },
  });
  await logSecurity(
    user,
    "inventario_import",
    `Importó ${nombre} (hoja "${hoja}"): ${creados} creados, ${actualizados} actualizados`,
    projectId
  );

  revalidatePath(`/inventario/${projectId}`);
  redirect(
    `/inventario/${projectId}?ok=import&c=${creados}&a=${actualizados}&h=${encodeURIComponent(hoja)}&ig=${ignoradas.length}`
  );
}

// --- Subir un documento (PDF/Excel) como respaldo del inventario ----------
export async function subirDocumento(_prev: unknown, fd: FormData) {
  const projectId = String(fd.get("projectId") || "");
  const user = await guardInv(projectId);
  const file = fd.get("archivo") as File | null;
  if (!file || !file.size) return { error: "Selecciona un documento (PDF o Excel)." };
  let stored;
  try {
    stored = await storeFile(file, "inventario", user.id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!stored) return { error: "No se pudo guardar el documento." };
  await prisma.inventoryImport.create({
    data: {
      projectId,
      fileId: stored.id,
      formato: "pdf",
      filas: 0,
      userId: user.id,
      userName: user.displayName || user.username,
    },
  });
  await logSecurity(user, "doc_upload", `Documento cargado: ${stored.nombre}`, projectId);
  revalidatePath(`/inventario/${projectId}`);
  redirect(`/inventario/${projectId}?ok=doc`);
}
