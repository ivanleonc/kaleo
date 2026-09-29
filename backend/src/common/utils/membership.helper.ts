import { NotFoundException } from '@nestjs/common';
import type { QueryRunner } from 'typeorm';

/**
 * Inserta varios `user_contexts` en una sola sentencia.
 * Reemplaza el bucle `INSERT` por rol que generaba N queries por miembro.
 */
export async function insertUserContexts(
  queryRunner: QueryRunner,
  userId: string,
  companyId: string,
  roleIds: string[],
): Promise<void> {
  const uniqueRoleIds = [...new Set(roleIds.filter(Boolean))];
  if (uniqueRoleIds.length === 0) return;

  const values = uniqueRoleIds
    .map((_, i) => `($1, $2, $${i + 3})`)
    .join(', ');

  await queryRunner.query(
    `INSERT INTO user_contexts (user_id, company_id, role_id)
     VALUES ${values}
     ON CONFLICT DO NOTHING`,
    [userId, companyId, ...uniqueRoleIds],
  );
}

/**
 * Verifica que un usuario pertenezca a la empresa. Lanza 404 si no,
 * para no revelar la existencia del recurso fuera del tenant.
 */
export async function assertMember(
  query: (sql: string, params?: any[]) => Promise<any>,
  userId: string,
  companyId: string,
  message = 'El usuario no es miembro de esta empresa',
): Promise<void> {
  const result = await query(
    `SELECT 1 FROM user_contexts WHERE user_id = $1 AND company_id = $2 LIMIT 1`,
    [userId, companyId],
  );
  if (!result || result.length === 0) {
    throw new NotFoundException(message);
  }
}
