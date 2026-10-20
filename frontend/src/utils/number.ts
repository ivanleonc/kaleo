const integerFormatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const compactCurrencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function decimal(value: number, digits: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatCompactNumber(value: number): string {
  return compactFormatter.format(value);
}

export function formatCop(value: number): string {
  return currencyFormatter.format(value);
}

export function formatCopCompact(value: number): string {
  return compactCurrencyFormatter.format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${decimal(value, digits)} %`;
}

export function formatEnergyKwh(value: number): string {
  if (value >= 1_000_000_000) return `${decimal(value / 1_000_000_000, 1)} TWh`;
  if (value >= 1_000_000) return `${decimal(value / 1_000_000, 1)} GWh`;
  if (value >= 1_000) return `${decimal(value / 1_000, 1)} MWh`;
  return `${integerFormatter.format(value)} kWh`;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${decimal(bytes / (1024 * 1024), 1)} MB`;
  if (bytes >= 1024) return `${decimal(bytes / 1024, 1)} KB`;
  return `${integerFormatter.format(bytes)} B`;
}
