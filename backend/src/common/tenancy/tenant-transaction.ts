import type { DataSource, QueryRunner } from 'typeorm';
import type { TenantContextService } from './tenant-context.service.js';

/**
 * Ejecuta un bloque dentro de una transacción con `app.company_id` definido
 * de forma local. Es la base para que las políticas RLS se apliquen cuando la
 * aplicación use el rol `kaleo_app`.
 *
 * - Falla si no hay `TenantContext` con companyId.
 * - `set_config(..., true)` es local a la transacción; compatible con el pooler
 *   en modo transaction.
 * - Libera el QueryRunner siempre.
 */
export async function withTenantTransaction<T>(
  dataSource: DataSource,
  tenantContext: TenantContextService,
  fn: (queryRunner: QueryRunner) => Promise<T>,
): Promise<T> {
  const companyId = tenantContext.requireCompanyId();
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    await queryRunner.query(
      `SELECT set_config('app.company_id', $1, true)`,
      [companyId],
    );
    const result = await fn(queryRunner);
    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
