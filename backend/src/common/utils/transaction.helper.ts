import type { DataSource, QueryRunner } from 'typeorm';

/**
 * Ejecuta `fn` dentro de una transacción de base de datos.
 *
 * Si `fn` lanza, hace rollback automáticamente y re-lanza el error.
 * Siempre libera el QueryRunner en el bloque `finally`.
 *
 * Uso:
 * ```ts
 * await runInTransaction(this.dataSource, async (runner) => {
 *   await runner.query('INSERT ...', [...]);
 *   await runner.query('UPDATE ...', [...]);
 * });
 * ```
 */
export async function runInTransaction<T>(
  dataSource: DataSource,
  fn: (runner: QueryRunner) => Promise<T>,
): Promise<T> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const result = await fn(runner);
    await runner.commitTransaction();
    return result;
  } catch (err) {
    await runner.rollbackTransaction();
    throw err;
  } finally {
    await runner.release();
  }
}
