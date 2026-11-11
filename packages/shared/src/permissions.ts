/**
 * Permission constants — mirror of backend/src/common/constants/permissions.ts
 *
 * Naming convention: `core.<module>.<action>`
 *
 * To add a new permission:
 * 1. Add the constant in backend first
 * 2. Mirror it here
 * 3. Add the row to the SQL seed/migration
 * 4. Use in Vue: v-permission="Permissions.USERS.CREATE"
 */
export const Permissions = {
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

  AI: {
    READ: 'core.ai.read',
    RUN: 'core.ai.run',
    APPROVE: 'core.ai.approve',
  },

  DOCUMENTS: {
    READ: 'core.documents.read',
    CREATE: 'core.documents.create',
    UPDATE: 'core.documents.update',
    DELETE: 'core.documents.delete',
  },

  PARTIES: {
    READ: 'core.parties.read',
    CREATE: 'core.parties.create',
    UPDATE: 'core.parties.update',
    DELETE: 'core.parties.delete',
  },
} as const;

/** Unión de todos los códigos de permiso: 'core.users.read' | ... */
export type PermissionCode =
  (typeof Permissions)[keyof typeof Permissions][keyof (typeof Permissions)[keyof typeof Permissions]];

/** Lista plana de todos los códigos — útil para seeds y validaciones. */
export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(Permissions).flatMap(
  (module) => Object.values(module) as PermissionCode[],
);
