/**
 * System role names — mirror of backend/src/common/constants/roles.ts
 *
 * Always import from here instead of hardcoding role names.
 */
export const SystemRoles = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  VIEWER: 'Viewer',
} as const;

export type SystemRoleName = (typeof SystemRoles)[keyof typeof SystemRoles];

/** Roles protegidos contra eliminación. */
export const PROTECTED_ROLES: readonly SystemRoleName[] = [SystemRoles.OWNER, SystemRoles.ADMIN];

/** Roles con permisos inmutables. */
export const IMMUTABLE_ROLES: readonly SystemRoleName[] = [SystemRoles.OWNER];
