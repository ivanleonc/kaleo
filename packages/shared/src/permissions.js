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
};
export const ALL_PERMISSION_CODES = Object.values(Permissions).flatMap((module) => Object.values(module));
//# sourceMappingURL=permissions.js.map