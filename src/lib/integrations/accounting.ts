/**
 * Punto de integración con Contabilidad (FUTURO).
 *
 * Cuando el departamento de contabilidad exponga su base/endpoint, aquí se
 * enviará cada abono/pago para conciliación. Hoy es un no-op que deja la puerta
 * lista: se llama después de registrar cada abono. Marca `contabilidadSync`
 * cuando el envío sea exitoso.
 *
 * Config futura por variables de entorno, p. ej.:
 *   ACCOUNTING_WEBHOOK_URL, ACCOUNTING_API_KEY
 */
export interface AbonoContable {
  abonoId: string;
  negocioId: string;
  projectId: string;
  monto: number;
  tipo: string;
  metodo: string;
  fecha: Date;
  boletaFileId?: string | null;
}

export async function notifyAccounting(_abono: AbonoContable): Promise<boolean> {
  const url = process.env.ACCOUNTING_WEBHOOK_URL;
  if (!url) return false; // integración aún no configurada
  try {
    // Implementación futura: POST al webhook de contabilidad.
    // await fetch(url, { method: "POST", headers: {...}, body: JSON.stringify(_abono) });
    return false;
  } catch {
    return false;
  }
}
