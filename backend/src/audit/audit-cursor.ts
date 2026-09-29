/**
 * Cursor opaco para la paginación keyset de auditoría.
 *
 * Se codifica como `base64url(created_at_iso|id)`. El par `(created_at, id)` es
 * la clave de orden, de modo que el cursor apunta a la última fila entregada y
 * la siguiente página es exactamente la comparación por tuplas de Postgres:
 *
 *   WHERE (al.created_at, al.id) < ($createdAt, $id)
 *
 * Se incluye `id` porque `created_at` no es único: sin ese desempate, filas con
 * la misma marca de tiempo podían repetirse o saltarse entre páginas.
 */

const SEPARATOR = '|';

export interface AuditCursor {
  createdAt: string;
  id: string;
}

export function encodeAuditCursor(row: { created_at: string | Date; id: string }): string {
  const createdAt =
    row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
  return Buffer.from(`${createdAt}${SEPARATOR}${row.id}`, 'utf-8').toString('base64url');
}

/**
 * Devuelve `null` si el cursor no es decodificable. La forma del cursor ya se
 * valida en `AuditQueryDto`, así que llegar aquí con `null` significa un cursor
 * bien formado pero corrupto: se ignora y la consulta arranca desde el inicio,
 * que es preferible a fallar con un 500.
 */
export function decodeAuditCursor(cursor: string): AuditCursor | null {
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(SEPARATOR);
  if (separatorIndex <= 0) return null;

  const createdAt = decoded.slice(0, separatorIndex);
  const id = decoded.slice(separatorIndex + 1);
  if (!createdAt || !id) return null;
  if (Number.isNaN(new Date(createdAt).getTime())) return null;

  return { createdAt, id };
}
