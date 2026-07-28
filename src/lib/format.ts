// Utilidades de formato (moneda USD de El Salvador, fechas, semana ISO).

export function money(n: number | null | undefined): string {
  const v = Number(n || 0);
  return v.toLocaleString("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function money0(n: number | null | undefined): string {
  const v = Number(n || 0);
  return v.toLocaleString("es-SV", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function num(n: number | null | undefined): string {
  return Number(n || 0).toLocaleString("es-SV");
}

export function fecha(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-SV", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function fechaHora(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("es-SV", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Fecha en formato yyyy-mm-dd para inputs date (sin desfase de zona). */
export function inputDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Semana ISO como "2026-S31" para agrupar reportes semanales. */
export function semanaISO(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-S${String(week).padStart(2, "0")}`;
}

/** Rango de fechas de un preset. */
export function rangoPreset(preset: string): { desde: Date; hasta: Date } {
  const hasta = new Date();
  const desde = new Date();
  switch (preset) {
    case "hoy":
      desde.setHours(0, 0, 0, 0);
      break;
    case "semana":
      desde.setDate(desde.getDate() - 7);
      break;
    case "mes":
      desde.setDate(desde.getDate() - 30);
      break;
    case "trimestre":
      desde.setDate(desde.getDate() - 90);
      break;
    case "anio":
      desde.setDate(desde.getDate() - 365);
      break;
    default:
      desde.setDate(desde.getDate() - 30);
  }
  desde.setHours(0, 0, 0, 0);
  return { desde, hasta };
}

export function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}
