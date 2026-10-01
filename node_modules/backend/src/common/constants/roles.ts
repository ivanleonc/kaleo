/**
 * System role names — single source of truth.
 *
 * These roles are protected: they cannot be deleted or (for Owner) have permissions modified.
 * To reference a system role in code, always import from here.
 */
export const SystemRoles = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  VIEWER: 'Viewer',
} as const;

export type SystemRoleName = (typeof SystemRoles)[keyof typeof SystemRoles];

/**
 * Role names that are protected from deletion.
 */
export const PROTECTED_ROLES: readonly SystemRoleName[] = [SystemRoles.OWNER, SystemRoles.ADMIN];

/**
 * Role names that are protected from permission modification.
 */
export const IMMUTABLE_ROLES: readonly SystemRoleName[] = [SystemRoles.OWNER];
