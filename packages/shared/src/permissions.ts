/**
 * Permission constants — mirror of backend/src/common/constants/permissions.ts
 *
 * Naming convention: `core.<module>.<action>`
 *
 * To add a new permission:
 * 1. Add the constant in backend first
 * 2. Mirror it here
 * 3. Add the row to the SQL seed (004-seed-permissions-roles.sql)
 * 4. Use in Vue: v-permission="Permissions.USERS.CREATE"
 */
export const Permissions = {
  AUTH: {
    READ: 'core.auth.read',
    UPDATE: 'core.auth.update',
  },

  USERS: {
    READ: 'core.users.read',
    CREATE: 'core.users.create',
    UPDATE: 'core.users.update',
    DELETE: 'core.users.delete',
  },

  ROLES: {
    READ: 'core.roles.read',
    CREATE: 'core.roles.create',
    UPDATE: 'core.roles.update',
    DELETE: 'core.roles.delete',
  },

  COMPANY: {
    READ: 'core.company.read',
    UPDATE: 'core.company.update',
  },

  SETTINGS: {
    READ: 'core.settings.read',
    UPDATE: 'core.settings.update',
  },

  PROFILE: {
    READ: 'core.profile.read',
    UPDATE: 'core.profile.update',
  },

  DASHBOARD: {
    READ: 'core.dashboard.read',
  },

  BRANCHES: {
    READ: 'core.branches.read',
    CREATE: 'core.branches.create',
    UPDATE: 'core.branches.update',
    DELETE: 'core.branches.delete',
  },

  ANALYSES: {
    READ: 'core.analyses.read',
    CREATE: 'core.analyses.create',
    UPDATE: 'core.analyses.update',
    DELETE: 'core.analyses.delete',
  },

  AUDIT: {
    READ: 'core.audit.read',
  },

  BILLING: {
    READ: 'core.billing.read',
    UPDATE: 'core.billing.update',
  },

  NOTIFICATIONS: {
    READ: 'core.notifications.read',
    UPDATE: 'core.notifications.update',
  },

  INTEGRATIONS: {
    READ: 'core.integrations.read',
    UPDATE: 'core.integrations.update',
  },
} as const;

/** Unión de todos los códigos de permiso: 'core.auth.read' | 'core.users.create' | ... */
export type PermissionCode =
  (typeof Permissions)[keyof typeof Permissions][keyof (typeof Permissions)[keyof typeof Permissions]];

/** Lista plana de todos los códigos — útil para seeds y validaciones. */
export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(Permissions).flatMap(
  (module) => Object.values(module) as PermissionCode[],
);
