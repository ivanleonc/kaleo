/**
 * Constructor dinámico de UPDATE ... SET campo=$n.
 * Unifica los 5+ builders repetidos en los repositories.
 *
 * @param data objeto con los campos a actualizar (solo los !== undefined entran)
 * @param allowedFields lista blanca de columnas permitidas
 * @param options.nullEmptyStrings convierte '' en NULL (para columnas NULLables)
 * @param options.extraSet fragmentos SQL extra (ej. 'updated_at = NOW()')
 * @returns { updates, values, apply } — apply antepone placeholders y devuelve el SET
 */
export interface DynamicUpdateOptions {
  /**
   * Convierte '' en NULL. `true` = todos los campos,
   * array = solo los listados (útil para no nulificar NOT NULL como `name`).
   */
  nullEmptyStrings?: boolean | readonly string[];
  extraSet?: string[];
}

export function buildDynamicUpdate<T extends Record<string, any>>(
  data: Partial<T>,
  allowedFields: readonly (keyof T | string)[],
  options: DynamicUpdateOptions = {},
): { updates: string[]; values: any[]; startIndex: number } {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    const key = String(field);
    const value = (data as Record<string, any>)[key];
    if (value === undefined) continue;
    const nullify =
      options.nullEmptyStrings === true ||
      (Array.isArray(options.nullEmptyStrings) && options.nullEmptyStrings.includes(key));
    updates.push(`${key} = $${paramIndex++}`);
    values.push(nullify && value === '' ? null : value);
  }

  if (options.extraSet) {
    updates.push(...options.extraSet);
  }

  return { updates, values, startIndex: paramIndex };
}

/**
 * Constructor dinámico de WHERE con placeholders numerados.
 *
 * Cada condición puede:
 *  - no tener placeholders (ej. `u.deleted_at IS NULL`), en cuyo caso no
 *    consume un parámetro;
 *  - usar `$?` varias veces con `reuse: true` para repetir el mismo valor
 *    (ej. `(u.name ILIKE $1 OR u.email ILIKE $1)`).
 *
 * @param startIndex índice inicial ($1, $2...). Retorna { where, values, nextIndex }.
 */
export interface WhereCondition {
  clause: string;
  value?: any;
  /** Reutiliza el mismo placeholder para todos los `$?` de la cláusula. */
  reuse?: boolean;
}

export function buildWhere(
  conditions: Array<WhereCondition | undefined | false | null>,
  startIndex = 1,
): { where: string; values: any[]; nextIndex: number } {
  const parts: string[] = [];
  const values: any[] = [];
  let idx = startIndex;

  for (const cond of conditions) {
    if (!cond) continue;

    if (!cond.clause.includes('$?')) {
      parts.push(cond.clause);
      continue;
    }

    if (cond.reuse) {
      parts.push(cond.clause.replace(/\$\?/g, () => `$${idx}`));
      values.push(cond.value);
      idx++;
      continue;
    }

    parts.push(cond.clause.replace(/\$\?/g, () => `$${idx++}`));
    values.push(cond.value);
  }

  return { where: parts.join(' AND '), values, nextIndex: idx };
}
