/**
 * Permission constants — single source of truth for the RBAC system.
 *
 * Naming convention: `core.<module>.<action>`
 *
 * To add a new permission:
 * 1. Add the constant here
 * 2. Mirror it in packages/shared/src/permissions.ts
 * 3. Add the row to the SQL seed/migration
 * 4. Use @RequirePermissions(Permissions.MODULE.ACTION) in controllers
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

  CATALOG: {
    READ: 'core.catalog.read',
    CREATE: 'core.catalog.create',
    UPDATE: 'core.catalog.update',
    DELETE: 'core.catalog.delete',
  },

  PROJECTS: {
    READ: 'construction.projects.read',
    CREATE: 'construction.projects.create',
    UPDATE: 'construction.projects.update',
    DELETE: 'construction.projects.delete',
    BUDGET_READ: 'construction.projects.budget.read',
    BUDGET_UPDATE: 'construction.projects.budget.update',
    BUDGET_APPROVE: 'construction.projects.budget.approve',
  },

  ESTIMATING: {
    READ: 'construction.estimating.read',
    CREATE: 'construction.estimating.create',
    UPDATE: 'construction.estimating.update',
    DELETE: 'construction.estimating.delete',
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
