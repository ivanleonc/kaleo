/**
 * System role names — re-export de @saas/shared.
 *
 * Fuente de verdad: packages/shared/src/roles.ts
 * El CI (check-permissions) valida que frontend, backend y shared
 * estén sincronizados.
 *
 * Always import from here instead of hardcoding role names.
 */
export { SystemRoles } from '@saas/shared';
export type { SystemRoleName } from '@saas/shared';
