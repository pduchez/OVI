"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getScope, canAccessProject } from "@/lib/permissions";
import { ESTADOS_VENTA_VIVA } from "@/lib/constants";
import { storeFile } from "@/lib/files";
import { logSecurity } from "@/lib/securityLog";
import { notifyAccounting } from "@/lib/integrations/accounting";

function parseDate(v: FormDataEntryValue | null): Date {
  const s = String(v || "").trim();
  if (!s) return new Date();
  const d = new Date(s + "T12:00:00"); // mediodía para evitar desfase de zona
  return isNaN(d.getTime()) ? new Date() : d;
}

function money(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v || "0").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

async function guard(projectId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = await getScope(user);
  if (!scope.canRegister || !canAccessProject(scope, projectId)) {
    throw new Error("No tienes permiso para registrar en este proyecto.");
  }
  return { user, scope };
}

/** Fuerza efectiva: si el usuario tiene fuerza fija (DP), se respeta esa. */
function fuerzaEfectiva(scope: { fuerzaFija: string | null }, fd: FormData): string {
  return scope.fuerzaFija || String(fd.get("fuerza") || "interna");
}

async function logRegistro(data: {
  tipo: string;
  projectId: string;
  refId: string;
  resumen: string;
  monto?: number;
  userId?: string;
}) {
  await prisma.registro.create({
    data: {
      tipo: data.tipo,
      projectId: data.projectId,
      refId: data.refId,
      resumen: data.resumen,
      monto: data.monto || 0,
      registradoPorId: data.userId || null,
    },
  });
}

// --- Visita --------------------------------------------------------------
export async function registrarVisita(_prev: unknown, fd: FormData) {
  const projectId = String(fd.get("projectId") || "");
  if (!projectId) return { error: "Selecciona el proyecto." };
  const cliente = String(fd.get("clienteNombre") || "").trim();
  if (!cliente) return { error: "Escribe el nombre del cliente." };
  const { user, scope } = await guard(projectId);

  const v = await prisma.visita.create({
    data: {
      projectId,
      fecha: parseDate(fd.get("fecha")),
      clienteNombre: cliente,
      clienteTelefono: String(fd.get("clienteTelefono") || "").trim(),
      vendedorId: String(fd.get("vendedorId") || "") || null,
      fuerza: fuerzaEfectiva(scope, fd),
      origen: String(fd.get("origen") || "otro"),
      interesado: fd.get("interesado") === "on",
      notas: String(fd.get("notas") || "").trim(),
      registradoPorId: user.id,
    },
  });
  await logRegistro({
    tipo: "visita",
    projectId,
    refId: v.id,
    resumen: `Visita de ${cliente}`,
    userId: user.id,
  });
  revalidatePath("/");
  redirect("/registrar?ok=visita");
}

// --- Negocio (reserva o venta) ------------------------------------------
export async function registrarNegocio(_prev: unknown, fd: FormData) {
  const projectId = String(fd.get("projectId") || "");
  if (!projectId) return { error: "Selecciona el proyecto." };
  const cliente = String(fd.get("clienteNombre") || "").trim();
  if (!cliente) return { error: "Escribe el nombre del cliente." };
  const tipo = String(fd.get("tipo") || "reserva"); // reserva | venta
  const { user, scope } = await guard(projectId);

  const prima = money(fd.get("prima"));
  const fecha = parseDate(fd.get("fecha"));
  const esVenta = tipo === "venta";
  const loteId = String(fd.get("loteId") || "") || null;

  // Precio: si el negocio se asocia a un lote del inventario, el precio se toma
  // del lote y queda BLOQUEADO (el vendedor/líder no lo puede alterar). Solo si
  // el proyecto aún no tiene inventario se acepta un precio manual.
  let precioLote = money(fd.get("precioLote"));
  let loteRef = String(fd.get("loteRef") || "").trim();
  let lote = null as Awaited<ReturnType<typeof prisma.lote.findUnique>> | null;
  if (loteId) {
    lote = await prisma.lote.findUnique({ where: { id: loteId } });
    if (!lote || lote.projectId !== projectId) {
      return { error: "El lote seleccionado no es válido." };
    }
    if (lote.estado !== "disponible") {
      return { error: `El lote ${lote.numero} ya no está disponible.` };
    }
    precioLote = lote.precio; // precio bloqueado desde inventario
    loteRef = lote.numero;
  }

  // Depósito + boleta: toda reserva o venta de una fuerza de venta va
  // respaldada con la foto de la boleta. La capa de mando puede registrar sin
  // ella (excepción) y queda anotado en la bitácora de seguridad.
  let boletaFileId: string | null = null;
  if (scope.requiereBoleta) {
    if (prima <= 0) {
      return {
        error:
          "La reserva o venta debe ir respaldada con un depósito. Escribe el monto recibido.",
      };
    }
    let stored: { id: string } | null = null;
    try {
      stored = await storeFile(fd.get("boleta") as File | null, "boleta", user.id);
    } catch (e) {
      return { error: (e as Error).message };
    }
    if (!stored) {
      return {
        error:
          "Adjunta la foto de la boleta del depósito. Sin boleta no se puede reservar ni vender.",
      };
    }
    boletaFileId = stored.id;
  } else if (prima > 0) {
    try {
      const stored = await storeFile(fd.get("boleta") as File | null, "boleta", user.id);
      boletaFileId = stored?.id || null;
    } catch (e) {
      return { error: (e as Error).message };
    }
  }

  const negocio = await prisma.negocio.create({
    data: {
      projectId,
      loteId: loteId || undefined,
      loteRef,
      clienteNombre: cliente,
      clienteTelefono: String(fd.get("clienteTelefono") || "").trim(),
      vendedorId: String(fd.get("vendedorId") || "") || null,
      fuerza: fuerzaEfectiva(scope, fd),
      estado: esVenta ? "vendido" : "reservado",
      precioLote,
      prima,
      fechaReserva: fecha,
      fechaVenta: esVenta ? fecha : null,
      notas: String(fd.get("notas") || "").trim(),
      registradoPorId: user.id,
    },
  });

  // Bloqueo de inventario: la reserva/venta marca el lote como no disponible.
  if (lote) {
    await prisma.lote.update({
      where: { id: lote.id },
      data: { estado: esVenta ? "vendido" : "reservado" },
    });
  }

  // Si registró prima al momento, crea el abono inicial con su boleta.
  if (prima > 0) {
    await prisma.abono.create({
      data: {
        negocioId: negocio.id,
        fecha,
        monto: prima,
        tipo: "prima",
        metodo: boletaFileId ? "deposito" : String(fd.get("metodo") || "efectivo"),
        boletaFileId,
        registradoPorId: user.id,
      },
    });
  }
  if (!boletaFileId) {
    await logSecurity(
      user,
      "negocio_sin_boleta",
      `${esVenta ? "Venta" : "Reserva"} de ${loteRef || "lote sin inventario"} — ${cliente}: registrada SIN boleta de depósito`,
      projectId
    );
  }

  await logRegistro({
    tipo: esVenta ? "venta" : "reserva",
    projectId,
    refId: negocio.id,
    resumen: `${esVenta ? "Venta" : "Reserva"} — ${cliente}${
      negocio.loteRef ? ` (${negocio.loteRef})` : ""
    }`,
    monto: esVenta ? precioLote : prima,
    userId: user.id,
  });
  revalidatePath("/");
  redirect(`/negocios/${negocio.id}?ok=1`);
}

// --- Abono ---------------------------------------------------------------
export async function registrarAbono(_prev: unknown, fd: FormData) {
  const negocioId = String(fd.get("negocioId") || "");
  if (!negocioId) return { error: "Selecciona el negocio." };
  const negocio = await prisma.negocio.findUnique({ where: { id: negocioId } });
  if (!negocio) return { error: "Negocio no encontrado." };
  const { user } = await guard(negocio.projectId);
  const monto = money(fd.get("monto"));
  if (monto <= 0) return { error: "El monto debe ser mayor que cero." };
  const metodo = String(fd.get("metodo") || "efectivo"); // efectivo | deposito

  // Si es depósito/transferencia, la foto de la boleta es OBLIGATORIA.
  let boletaFileId: string | null = null;
  if (metodo === "deposito") {
    let stored: { id: string } | null = null;
    try {
      stored = await storeFile(fd.get("boleta") as File | null, "boleta", user.id);
    } catch (e) {
      return { error: (e as Error).message };
    }
    if (!stored) {
      return { error: "Para un depósito debes adjuntar la foto de la boleta." };
    }
    boletaFileId = stored.id;
  }

  const abono = await prisma.abono.create({
    data: {
      negocioId,
      fecha: parseDate(fd.get("fecha")),
      monto,
      tipo: String(fd.get("tipo") || "cuota"),
      metodo,
      referencia: String(fd.get("referencia") || "").trim(),
      boletaFileId,
      registradoPorId: user.id,
    },
  });

  // Enlace con Contabilidad (integración futura; hoy no-op).
  await notifyAccounting({
    abonoId: abono.id,
    negocioId,
    projectId: negocio.projectId,
    monto,
    tipo: abono.tipo,
    metodo,
    fecha: abono.fecha,
    boletaFileId,
  });

  // Si estaba en mora y abonó, vuelve a "vendido".
  if (negocio.estado === "en_mora") {
    await prisma.negocio.update({
      where: { id: negocioId },
      data: { estado: "vendido" },
    });
  }

  await logRegistro({
    tipo: "abono",
    projectId: negocio.projectId,
    refId: negocioId,
    resumen: `Abono de ${negocio.clienteNombre}${metodo === "deposito" ? " (depósito)" : ""}`,
    monto,
    userId: user.id,
  });
  revalidatePath("/");
  redirect(`/negocios/${negocioId}?ok=abono`);
}

// --- Caída ---------------------------------------------------------------
export async function registrarCaida(_prev: unknown, fd: FormData) {
  const negocioId = String(fd.get("negocioId") || "");
  const negocio = await prisma.negocio.findUnique({ where: { id: negocioId } });
  if (!negocio) return { error: "Negocio no encontrado." };
  const { user } = await guard(negocio.projectId);

  await prisma.negocio.update({
    where: { id: negocioId },
    data: {
      estado: "caido",
      fechaCaida: parseDate(fd.get("fecha")),
      motivoCaida: String(fd.get("motivoCaida") || "otro"),
      notas: negocio.notas
        ? `${negocio.notas}\n[Caída] ${String(fd.get("detalle") || "")}`
        : `[Caída] ${String(fd.get("detalle") || "")}`,
    },
  });
  // Liberar el lote en el inventario (vuelve a disponible).
  if (negocio.loteId) {
    await prisma.lote.update({
      where: { id: negocio.loteId },
      data: { estado: "disponible" },
    });
  }
  await logRegistro({
    tipo: "caida",
    projectId: negocio.projectId,
    refId: negocioId,
    resumen: `Caída — ${negocio.clienteNombre}`,
    monto: negocio.precioLote,
    userId: user.id,
  });
  revalidatePath("/");
  redirect(`/negocios/${negocioId}?ok=caida`);
}

// --- Marcar escriturado --------------------------------------------------
export async function marcarEscriturado(_prev: unknown, fd: FormData) {
  const negocioId = String(fd.get("negocioId") || "");
  const negocio = await prisma.negocio.findUnique({ where: { id: negocioId } });
  if (!negocio) return { error: "Negocio no encontrado." };
  const { user } = await guard(negocio.projectId);
  await prisma.negocio.update({
    where: { id: negocioId },
    data: { estado: "escriturado", fechaEscritura: new Date() },
  });
  await logRegistro({
    tipo: "escritura",
    projectId: negocio.projectId,
    refId: negocioId,
    resumen: `Escriturado — ${negocio.clienteNombre}`,
    userId: user.id,
  });
  revalidatePath("/");
  redirect(`/negocios/${negocioId}?ok=escritura`);
}

// --- Novedad -------------------------------------------------------------
export async function registrarNovedad(_prev: unknown, fd: FormData) {
  const projectId = String(fd.get("projectId") || "");
  if (!projectId) return { error: "Selecciona el proyecto." };
  const titulo = String(fd.get("titulo") || "").trim();
  if (!titulo) return { error: "Escribe un título para la novedad." };
  const { user } = await guard(projectId);

  const n = await prisma.novedad.create({
    data: {
      projectId,
      fecha: parseDate(fd.get("fecha")),
      categoria: String(fd.get("categoria") || "operativo"),
      titulo,
      detalle: String(fd.get("detalle") || "").trim(),
      prioridad: String(fd.get("prioridad") || "media"),
      estado: "abierta",
      registradoPorId: user.id,
    },
  });
  await logRegistro({
    tipo: "novedad",
    projectId,
    refId: n.id,
    resumen: `Novedad: ${titulo}`,
    userId: user.id,
  });
  revalidatePath("/");
  redirect("/novedades?ok=1");
}

// --- Cambiar estado de una novedad --------------------------------------
export async function actualizarNovedad(fd: FormData) {
  const id = String(fd.get("id") || "");
  const estado = String(fd.get("estado") || "abierta");
  const n = await prisma.novedad.findUnique({ where: { id } });
  if (!n) return;
  await guard(n.projectId);
  await prisma.novedad.update({ where: { id }, data: { estado } });
  revalidatePath("/novedades");
}
