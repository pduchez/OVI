"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getScope, canAccessProject, canAccessInventario } from "@/lib/permissions";
import { storeFile } from "@/lib/files";
import { logSecurity } from "@/lib/securityLog";
import { parseInventoryDetallado } from "@/lib/inventory";
import { notifyAccounting } from "@/lib/integrations/accounting";

function money(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v || "0").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseDate(v: FormDataEntryValue | null): Date {
  const s = String(v || "").trim();
  if (!s) return new Date();
  const d = new Date(s + "T12:00:00");
  return isNaN(d.getTime()) ? new Date() : d;
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

/** Quien puede mover el ESTADO de un lote: ventas de sitio, UCOES, DP y mando. */
async function guardEstadoLote(projectId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = await getScope(user);
  if (!scope.canSetLoteEstado || !canAccessInventario(scope, projectId)) {
    throw new Error("No tienes permiso para actualizar lotes de este proyecto.");
  }
  return { user, scope };
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
  if (/\.xls$/i.test(nombre)) {
    return {
      error:
        "El formato .xls (Excel 97-2003) no se puede leer. Ábrelo en Excel y usa \u201cGuardar como\u201d → Libro de Excel (.xlsx).",
    };
  }
  if (!/\.(xlsx|xlsm|csv|txt|tsv|pdf)$/i.test(nombre)) {
    return {
      error:
        "Formato no soportado para importar. Usa .xlsx, .xlsm, .csv, .txt o .pdf.",
    };
  }

  let rows;
  let stored;
  let hoja = "";
  let ignoradas: string[] = [];
  let diagnostico: { hoja: string; columnas: string[]; lotes: number }[] = [];
  let informe: Awaited<ReturnType<typeof parseInventoryDetallado>>["informe"];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const lectura = parseInventoryDetallado(buf, nombre);
    rows = lectura.filas;
    informe = lectura.informe;
    hoja = lectura.hoja;
    ignoradas = lectura.hojasIgnoradas;
    diagnostico = lectura.diagnostico;
    stored = await storeFile(file, "inventario", user.id);
  } catch (e) {
    return { error: "No se pudo leer el archivo: " + (e as Error).message };
  }
  if (!rows.length) {
    // Mensaje que explica QUÉ se vio, para no dejar al usuario adivinando.
    const detalle = diagnostico
      .slice(0, 6)
      .map((d) => `· "${d.hoja}": ${d.columnas.length ? d.columnas.join(", ") : "(vacía)"}`)
      .join("\n");
    return {
      error:
        "No se encontraron lotes en el archivo. Se necesita una hoja con una columna de " +
        "lote (o polígono + lote) y una de precio o área.\n\nEsto es lo que se leyó:\n" +
        detalle,
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

  // --- El archivo REEMPLAZA al inventario, no se suma a él ----------------
  //
  // Manda lo que sube quien está en el campo. Los proyectos vienen con lotes
  // precargados que casi nunca coinciden con la realidad del terreno; si se
  // conservaran, quedarían mezclados con los del archivo y se ofrecerían
  // lotes que no existen.
  //
  // Con UNA excepción que no se negocia: un lote con historial NO se borra.
  // Si está reservado, vendido, bloqueado, o tiene un negocio colgando, se
  // conserva aunque no venga en el archivo — borrarlo destruiría el registro
  // de una venta y el respaldo de un dinero recibido. Esos se informan para
  // que la Gerencia los revise a mano.
  const delArchivo = rows.map((r) => r.numero);
  const sobrantes = await prisma.lote.findMany({
    where: { projectId, numero: { notIn: delArchivo } },
    include: { _count: { select: { negocios: true } } },
  });
  const retirables = sobrantes.filter(
    (l) => l.estado === "disponible" && l._count.negocios === 0
  );
  const conConHistorial = sobrantes.filter(
    (l) => !(l.estado === "disponible" && l._count.negocios === 0)
  );
  if (retirables.length) {
    await prisma.lote.deleteMany({ where: { id: { in: retirables.map((l) => l.id) } } });
  }
  const eliminados = retirables.length;
  const conservados = conConHistorial.length;

  // Cómo se entendió el archivo. Va a la pantalla y a la bitácora: cada
  // proyecto arma el suyo distinto y quien lo sube tiene que poder comprobar
  // que OVI lo leyó como es, sin tener que confiar a ciegas.
  const porEstado = { disponible: 0, reservado: 0, vendido: 0, bloqueado: 0 } as Record<string, number>;
  for (const r of rows) porEstado[r.estado] = (porEstado[r.estado] || 0) + 1;
  const sinExplicar = (informe?.coloresSinExplicar || []).reduce((a, c) => a + c.lotes, 0);
  const leyenda = informe?.leyenda || [];
  const bloques = informe?.bloques || [];

  await prisma.inventoryImport.create({
    data: {
      projectId,
      fileId: stored?.id || null,
      formato: /\.csv$/i.test(nombre) ? "csv" : "excel",
      filas: rows.length,
      creados,
      actualizados,
      eliminados,
      conservados,
      userId: user.id,
      userName: user.displayName || user.username,
    },
  });
  const comoSeLeyo =
    (bloques.length
      ? ` · ${bloques.length} bloque(s): ${bloques.map((b) => `${b.poligono || "sin polígono"}=${b.lotes}`).join(", ")}`
      : "") +
    (leyenda.length
      ? ` · leyenda del archivo: ${leyenda.map((l) => `${l.etiqueta}→${l.estado}`).join(", ")}`
      : "") +
    ` · estados: ${porEstado.disponible} disponibles, ${porEstado.reservado} reservados, ` +
    `${porEstado.vendido} vendidos, ${porEstado.bloqueado} bloqueados` +
    (sinExplicar ? ` · ATENCIÓN: ${sinExplicar} lote(s) pintados sin leyenda que lo explique` : "");

  await logSecurity(
    user,
    "inventario_import",
    `Importó ${nombre} (hoja "${hoja}"): ${creados} creados, ${actualizados} actualizados, ` +
      `${eliminados} retirados por no venir en el archivo` +
      (conservados
        ? `, ${conservados} conservados pese a no venir en el archivo por tener historial (${conConHistorial
            .slice(0, 10)
            .map((l) => l.numero)
            .join(", ")}${conservados > 10 ? "…" : ""})`
        : "") +
      comoSeLeyo,
    projectId
  );

  revalidatePath(`/inventario/${projectId}`);
  redirect(
    `/inventario/${projectId}?ok=import&c=${creados}&a=${actualizados}&e=${eliminados}` +
      `&k=${conservados}&h=${encodeURIComponent(hoja)}&ig=${ignoradas.length}` +
      `&vd=${porEstado.vendido}&rs=${porEstado.reservado}&bl=${porEstado.bloqueado}` +
      `&sc=${sinExplicar}&bq=${bloques.length}` +
      `&ley=${encodeURIComponent(leyenda.map((l) => `${l.etiqueta}=${l.estado}`).join("|"))}`
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

// --- Reserva / venta de un lote DESDE EL INVENTARIO ----------------------
// Es la acción de campo de OVI: el vendedor está parado en el proyecto, marca
// el lote y queda bloqueado para todos al instante.
//
// Regla dura: toda reserva o venta va amarrada a un depósito con su boleta.
// La capa de mando (dirección, gerentes, asistentes) puede registrar sin
// boleta —para casos excepcionales— y esa excepción queda en la bitácora.
export async function reservarLote(_prev: unknown, fd: FormData) {
  const loteId = String(fd.get("loteId") || "");
  const lote = await prisma.lote.findUnique({ where: { id: loteId } });
  if (!lote) return { error: "El lote no existe." };
  const { user, scope } = await guardEstadoLote(lote.projectId);

  if (lote.estado !== "disponible") {
    return { error: `El lote ${lote.numero} ya está ${lote.estado}. Actualiza la página.` };
  }

  const tipo = String(fd.get("tipo") || "reserva"); // reserva | venta
  const esVenta = tipo === "venta";
  const cliente = String(fd.get("clienteNombre") || "").trim();
  if (!cliente) return { error: "Escribe el nombre del cliente." };
  const monto = money(fd.get("monto"));
  const fecha = parseDate(fd.get("fecha"));

  // Depósito + boleta: obligatorios para las fuerzas de venta.
  let boletaFileId: string | null = null;
  if (scope.requiereBoleta) {
    if (monto <= 0) {
      return { error: "La reserva o venta debe ir respaldada con un depósito. Escribe el monto recibido." };
    }
    let stored: { id: string } | null = null;
    try {
      stored = await storeFile(fd.get("boleta") as File | null, "boleta", user.id);
    } catch (e) {
      return { error: (e as Error).message };
    }
    if (!stored) {
      return { error: "Adjunta la foto de la boleta del depósito. Sin boleta no se puede reservar ni vender." };
    }
    boletaFileId = stored.id;
  } else if (monto > 0) {
    // El mando puede adjuntarla igual; si la trae, se guarda.
    try {
      const stored = await storeFile(fd.get("boleta") as File | null, "boleta", user.id);
      boletaFileId = stored?.id || null;
    } catch (e) {
      return { error: (e as Error).message };
    }
  }

  const fuerza = scope.fuerzaFija || String(fd.get("fuerza") || "interna");
  const negocio = await prisma.negocio.create({
    data: {
      projectId: lote.projectId,
      loteId: lote.id,
      loteRef: lote.numero,
      clienteNombre: cliente,
      clienteTelefono: String(fd.get("clienteTelefono") || "").trim(),
      fuerza,
      estado: esVenta ? "vendido" : "reservado",
      precioLote: lote.precio, // precio bloqueado desde inventario
      prima: monto,
      fechaReserva: fecha,
      fechaVenta: esVenta ? fecha : null,
      notas: String(fd.get("notas") || "").trim(),
      registradoPorId: user.id,
    },
  });

  // Bloqueo del inventario: a partir de aquí el lote no está disponible.
  await prisma.lote.update({
    where: { id: lote.id },
    data: { estado: esVenta ? "vendido" : "reservado" },
  });

  if (monto > 0) {
    const abono = await prisma.abono.create({
      data: {
        negocioId: negocio.id,
        fecha,
        monto,
        tipo: "prima",
        metodo: boletaFileId ? "deposito" : "efectivo",
        referencia: String(fd.get("referencia") || "").trim(),
        boletaFileId,
        registradoPorId: user.id,
      },
    });
    await notifyAccounting({
      abonoId: abono.id,
      negocioId: negocio.id,
      projectId: lote.projectId,
      monto,
      tipo: "prima",
      metodo: abono.metodo,
      fecha,
      boletaFileId,
    });
  }

  await prisma.registro.create({
    data: {
      tipo: esVenta ? "venta" : "reserva",
      projectId: lote.projectId,
      refId: negocio.id,
      resumen: `${esVenta ? "Venta" : "Reserva"} de ${lote.numero} — ${cliente} (desde inventario)`,
      monto: esVenta ? lote.precio : monto,
      registradoPorId: user.id,
    },
  });

  if (!boletaFileId) {
    // Excepción de mando: queda explícita para que se pueda auditar.
    await logSecurity(
      user,
      "lote_sin_boleta",
      `${esVenta ? "Venta" : "Reserva"} de ${lote.numero} registrada SIN boleta de depósito`,
      lote.projectId
    );
  }

  revalidatePath(`/inventario/${lote.projectId}`);
  redirect(`/inventario/${lote.projectId}?ok=${esVenta ? "venta" : "reserva"}&l=${encodeURIComponent(lote.numero)}`);
}

// --- Liberar un lote (revertir) -----------------------------------------
// Solo la capa de mando: devolver un lote a disponible deshace una reserva o
// una venta, así que no es una acción de campo.
export async function liberarLote(_prev: unknown, fd: FormData) {
  const loteId = String(fd.get("loteId") || "");
  const lote = await prisma.lote.findUnique({ where: { id: loteId } });
  if (!lote) return { error: "El lote no existe." };
  const { user, scope } = await guardEstadoLote(lote.projectId);
  if (!scope.canLiberarLote) {
    return { error: "Solo la dirección, los gerentes y las asistentes pueden liberar un lote." };
  }
  const motivo = String(fd.get("motivo") || "").trim();
  if (!motivo) return { error: "Escribe el motivo por el que se libera el lote." };

  // Da de baja el negocio vivo que tenga el lote, si lo hay.
  const vivos = await prisma.negocio.findMany({
    where: { loteId: lote.id, estado: { in: ["reservado", "vendido", "en_mora"] } },
  });
  for (const n of vivos) {
    await prisma.negocio.update({
      where: { id: n.id },
      data: {
        estado: "caido",
        fechaCaida: new Date(),
        motivoCaida: "liberado_inventario",
        notas: n.notas ? `${n.notas}\n[Liberado] ${motivo}` : `[Liberado] ${motivo}`,
      },
    });
  }
  await prisma.lote.update({ where: { id: lote.id }, data: { estado: "disponible" } });
  await logSecurity(
    user,
    "lote_liberado",
    `Lote ${lote.numero} liberado (${lote.estado} → disponible): ${motivo}`,
    lote.projectId
  );
  revalidatePath(`/inventario/${lote.projectId}`);
  redirect(`/inventario/${lote.projectId}?ok=liberado&l=${encodeURIComponent(lote.numero)}`);
}
