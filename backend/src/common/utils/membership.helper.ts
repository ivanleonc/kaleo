import { NotFoundException } from '@nestjs/common';
import type { QueryRunner } from 'typeorm';

/**
 * Escribe la membership (modelo nuevo) y, durante la transición, también
 * `user_contexts` (modelo plano legacy) para no romper lecturas antiguas.
 *
 * - memberships: upsert por (company_id, user_id).
 * - membership_roles: una fila por rol.
 * - user_contexts: una fila por rol, sin sede, como hasta ahora.
 */
export async function insertUserContexts(
  queryRunner: QueryRunner,
  userId: string,
  companyId: string,
  roleIds: string[],
): Promise<void> {
  const uniqueRoleIds = [...new Set(roleIds.filter(Boolean))];
  if (uniqueRoleIds.length === 0) return;

  const membershipRows = await queryRunner.query(
    `INSERT INTO memberships (company_id, user_id, status)
     VALUES ($1, $2, 'active')
     ON CONFLICT (company_id, user_id)
     DO UPDATE SET status = 'active', updated_at = now()
     RETURNING id`,
    [companyId, userId],
  );
  const membershipId = membershipRows[0]?.id as string;

  const roleValues = uniqueRoleIds.map((_, i) => `($1, $2, $${i + 3})`).join(', ');
  await queryRunner.query(
    `INSERT INTO membership_roles (company_id, membership_id, role_id)
     VALUES ${roleValues}
     ON CONFLICT DO NOTHING`,
    [companyId, membershipId, ...uniqueRoleIds],
  );

  // Compatibilidad temporal con el modelo plano.
  const contextValues = uniqueRoleIds.map((_, i) => `($1, $2, $${i + 3})`).join(', ');
  await queryRunner.query(
    `INSERT INTO user_contexts (user_id, company_id, role_id)
     VALUES ${contextValues}
     ON CONFLICT DO NOTHING`,
    [userId, companyId, ...uniqueRoleIds],
  );
}

/**
 * Verifica que un usuario sea miembro activo de la empresa. Lanza 404 si no,
 * para no revelar la existencia del recurso fuera del tenant.
 */
export async function assertMember(
  query: (sql: string, params?: any[]) => Promise<any>,
  userId: string,
  companyId: string,
  message = 'El usuario no es miembro de esta empresa',
): Promise<void> {
  const result = await query(
    `SELECT 1 FROM memberships
     WHERE user_id = $1 AND company_id = $2 AND status = 'active'
     LIMIT 1`,
    [userId, companyId],
  );
  if (!result || result.length === 0) {
    throw new NotFoundException(message);
  }
}
