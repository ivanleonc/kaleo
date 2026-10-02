/**
 * Permission constants — re-export de @saas/shared.
 *
 * Este archivo existe para no romper los ~40 imports existentes de
 * `@/constants/permissions`. La fuente de verdad vive en
 * `packages/shared/src/permissions.ts`.
 *
 * Para agregar un permiso nuevo:
 * 1. Agrégalo en packages/shared/src/permissions.ts (fuente de verdad)
 * 2. Espeja en backend/src/common/constants/permissions.ts
 * 3. Agrega el row al seed SQL (004-seed-permissions-roles.sql)
 * 4. El CI (check-permissions) valida que los tres estén sincronizados
 */
export { Permissions } from '@saas/shared';
export type { PermissionCode } from '@saas/shared';
