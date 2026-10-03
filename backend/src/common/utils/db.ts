/**
 * Helpers para tipar resultados de queries SQL crudas via TypeORM DataSource.
 *
 * TypeORM's `dataSource.query(sql, params)` retorna `any[]` — no hay manera
 * de tiparlo sin un ORM completo o un query builder como Kysely/Drizzle.
 *
 * Este módulo centraliza el cast en un lugar documentado:
 *
 *   - El lector sabe que es un cast explícito (no un `as any` disperso).
 *   - Una futura migración a Kysely/Drizzle solo requiere cambiar este archivo.
 *   - El type parameter `T` documenta la forma esperada del resultado.
 *
 * Uso:
 * ```ts
 * import { rows, row } from '../../common/utils/db.js';
 *
 * interface UserRow { id: string; email: string; name: string }
 *
 * const result = rows<UserRow>(await this.dataSource.query(sql, [userId]));
 * //    ^ UserRow[]  — TypeScript sabe la forma de cada elemento
 *
 * const first = row<UserRow>(await this.dataSource.query(sql, [userId]));
 * //    ^ UserRow | undefined
 * ```
 */

/**
 * Castea el resultado de `dataSource.query()` a un array tipado.
 * El cast es intencionado: la forma real viene garantizada por el SQL,
 * no por TypeScript. No agrega validación en runtime — para eso usar zod/joi.
 */
export function rows<T>(result: unknown[]): T[] {
  return result as T[];
}

/**
 * Devuelve el primer elemento del resultado, o `undefined` si está vacío.
 * Útil para queries que retornan 0 o 1 filas (p. ej. `WHERE id = $1`).
 */
export function row<T>(result: unknown[]): T | undefined {
  return (result as T[])[0];
}

/**
 * Wrapper sobre `dataSource.query` que aplica `rows<T>` automáticamente.
 * Conveniente para evitar la doble llamada:
 *
 * ```ts
 * // Sin wrapper:
 * const result = rows<UserRow>(await this.dataSource.query(sql, [id]));
 *
 * // Con wrapper (requiere pasar dataSource como argumento):
 * const result = await typedQuery<UserRow>(this.dataSource, sql, [id]);
 * ```
 */
export async function typedQuery<T>(
  dataSource: { query(sql: string, params?: unknown[]): Promise<unknown[]> },
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await dataSource.query(sql, params);
  return rows<T>(result);
}
