/**
 * Permission constants — mirror of backend/src/common/constants/permissions.ts
 *
 * Naming convention: `module:action`
 *
 * To add a new permission:
 * 1. Add the constant in backend first
 * 2. Mirror it here
 * 3. Add the row to the SQL seed (004-seed-permissions-roles.sql)
 * 4. Use in Vue: v-permission="Permissions.USERS.CREATE"
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
