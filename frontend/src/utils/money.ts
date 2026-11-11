/** Formato monetario común de la app (es-CO, con fallback si la moneda no existe). */
export function formatMoney(value: number, currency = 'COP'): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value}`;
  }
}

/** Formato numérico con separadores es-CO. */
export function formatQuantity(value: number, digits = 4): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: digits }).format(value);
}
