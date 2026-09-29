/** Utilidades de texto compartidas por vistas y componentes. */

/**
 * Iniciales para avatares: "Juan Pérez" → "JP", "Ana" → "AN".
 * @param max caracteres máximos (por defecto 2)
 */
export function getInitials(name?: string | null, max = 2): string {
  if (!name) return '?';
  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .filter(Boolean)
    .join('')
    .toUpperCase();
  return initials.slice(0, max) || '?';
}

/** Normaliza texto para comparaciones de búsqueda. */
export function normalizeText(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

/** Indica si alguno de los campos del haystack contiene la consulta. */
export function matchesQuery(
  query: string | null | undefined,
  ...haystack: Array<string | null | undefined>
): boolean {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;
  return haystack.some((field) => normalizeText(field).includes(normalizedQuery));
}

/**
 * Convierte strings vacíos (tras trim) en `undefined` para que no se envíen
 * como "" al backend y disparen validaciones o dirty checks innecesarios.
 */
export function emptyToUndefined(value?: string | null): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
