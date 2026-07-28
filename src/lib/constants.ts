// ============================================================
//  Catálogos de dominio de OVI.
//  Todo lo que en la UI sea un dropdown vive aquí, para minimizar
//  el error humano y mantener un solo lugar de la verdad.
// ============================================================

export const ROLES = [
  { value: "director", label: "Director" },
  { value: "gerente", label: "Gerente de ventas" },
  { value: "lider_central", label: "Líder de central (varios proyectos)" },
  { value: "lider_sitio", label: "Líder de proyecto (en sitio)" },
] as const;

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.label])
);

export const FUERZAS = [
  { value: "interna", label: "Interna (Oficina)" },
  { value: "ucoes", label: "UCOES (Externa)" },
] as const;

export const FUERZAS_CON_AMBAS = [
  ...FUERZAS,
  { value: "ambas", label: "Ambas fuerzas" },
] as const;

export const FUERZA_LABEL: Record<string, string> = {
  interna: "Interna (Oficina)",
  ucoes: "UCOES (Externa)",
  ambas: "Ambas fuerzas",
};

export const ORIGENES_VISITA = [
  { value: "redes", label: "Redes sociales" },
  { value: "referido", label: "Referido" },
  { value: "valla", label: "Valla / rótulo" },
  { value: "pasando", label: "Iba pasando" },
  { value: "evento", label: "Evento / feria" },
  { value: "otro", label: "Otro" },
] as const;

export const ESTADOS_NEGOCIO = [
  { value: "prospecto", label: "Prospecto" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido (en abonos)" },
  { value: "en_mora", label: "En mora" },
  { value: "escriturado", label: "Escriturado" },
  { value: "caido", label: "Caído" },
] as const;

export const ESTADO_NEGOCIO_LABEL: Record<string, string> = Object.fromEntries(
  ESTADOS_NEGOCIO.map((e) => [e.value, e.label])
);

// Estados que cuentan como "venta viva" (no caída ni simple prospecto).
export const ESTADOS_VENTA_VIVA = ["vendido", "en_mora", "escriturado"];

export const TIPOS_ABONO = [
  { value: "prima", label: "Prima / Enganche" },
  { value: "cuota", label: "Cuota mensual" },
  { value: "contado", label: "Pago de contado" },
] as const;

export const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo (cash)" },
  { value: "deposito", label: "Depósito / Transferencia" },
] as const;

export const MOTIVOS_CAIDA = [
  { value: "financiamiento", label: "No calificó / financiamiento" },
  { value: "desistio", label: "Cliente desistió" },
  { value: "precio", label: "Precio" },
  { value: "ubicacion", label: "Ubicación" },
  { value: "atencion", label: "Mala atención / seguimiento" },
  { value: "competencia", label: "Se fue con competencia" },
  { value: "otro", label: "Otro" },
] as const;

export const CATEGORIAS_NOVEDAD = [
  { value: "operativo", label: "Operativo" },
  { value: "legal", label: "Legal / documentación" },
  { value: "infraestructura", label: "Infraestructura / obra" },
  { value: "cliente", label: "Cliente / reclamo" },
  { value: "administrativo", label: "Administrativo" },
  { value: "otro", label: "Otro" },
] as const;

export const PRIORIDADES = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
] as const;

export const ESTADOS_NOVEDAD = [
  { value: "abierta", label: "Abierta" },
  { value: "en_proceso", label: "En proceso" },
  { value: "resuelta", label: "Resuelta" },
] as const;

export const ESTADOS_LOTE = [
  { value: "disponible", label: "Disponible" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido" },
  { value: "bloqueado", label: "Bloqueado" },
] as const;

// Los 14 departamentos de El Salvador (para el alta de proyectos).
export const DEPARTAMENTOS_SV = [
  "Ahuachapán",
  "Santa Ana",
  "Sonsonate",
  "Chalatenango",
  "La Libertad",
  "San Salvador",
  "Cuscatlán",
  "La Paz",
  "Cabañas",
  "San Vicente",
  "Usulután",
  "San Miguel",
  "Morazán",
  "La Unión",
] as const;

export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
