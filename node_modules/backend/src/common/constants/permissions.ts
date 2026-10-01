/**
 * Permission constants — single source of truth for the RBAC system.
 *
 * Naming convention: `module:action`
 *
 * To add a new permission:
 * 1. Add the constant here
 * 2. Mirror it in frontend/src/constants/permissions.ts
 * 3. Add the row to the SQL seed (004-seed-permissions-roles.sql)
 * 4. Use @RequirePermissions(Permissions.MODULE.ACTION) in controllers
 */
export const Permissions = {
  AUTH: {
    READ: 'auth:read',
    UPDATE: 'auth:update',
  },

  USERS: {
    READ: 'users:read',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
  },

  ROLES: {
    READ: 'roles:read',
    CREATE: 'roles:create',
    UPDATE: 'roles:update',
    DELETE: 'roles:delete',
  },

  COMPANY: {
    READ: 'company:read',
    UPDATE: 'company:update',
  },

  SETTINGS: {
    READ: 'settings:read',
    UPDATE: 'settings:update',
  },

  PROFILE: {
    READ: 'profile:read',
    UPDATE: 'profile:update',
  },

  DASHBOARD: {
    READ: 'dashboard:read',
  },

  BRANCHES: {
    READ: 'branches:read',
    CREATE: 'branches:create',
    UPDATE: 'branches:update',
    DELETE: 'branches:delete',
  },

  AUDIT: {
    READ: 'audit:read',
  },

  BILLING: {
    READ: 'billing:read',
    UPDATE: 'billing:update',
  },

  NOTIFICATIONS: {
    READ: 'notifications:read',
    UPDATE: 'notifications:update',
  },

  INTEGRATIONS: {
    READ: 'integrations:read',
    UPDATE: 'integrations:update',
  },
} as const;

/**
 * Flattened list of all permission codes.
 * Useful for seed scripts and validation.
 */
export type PermissionCode =
  | (typeof Permissions)[keyof typeof Permissions][keyof (typeof Permissions)[keyof typeof Permissions]];

export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(Permissions).flatMap(
  (module) => Object.values(module) as PermissionCode[],
);
