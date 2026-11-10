export declare const Permissions: {
    readonly USERS: {
        readonly READ: "core.users.read";
        readonly CREATE: "core.users.create";
        readonly UPDATE: "core.users.update";
        readonly DELETE: "core.users.delete";
    };
    readonly ROLES: {
        readonly READ: "core.roles.read";
        readonly CREATE: "core.roles.create";
        readonly UPDATE: "core.roles.update";
        readonly DELETE: "core.roles.delete";
    };
    readonly COMPANY: {
        readonly READ: "core.company.read";
        readonly UPDATE: "core.company.update";
    };
    readonly BRANCHES: {
        readonly READ: "core.branches.read";
        readonly CREATE: "core.branches.create";
        readonly UPDATE: "core.branches.update";
        readonly DELETE: "core.branches.delete";
    };
    readonly ANALYSES: {
        readonly READ: "core.analyses.read";
        readonly CREATE: "core.analyses.create";
        readonly UPDATE: "core.analyses.update";
        readonly DELETE: "core.analyses.delete";
    };
    readonly AUDIT: {
        readonly READ: "core.audit.read";
    };
};
export type PermissionCode = (typeof Permissions)[keyof typeof Permissions][keyof (typeof Permissions)[keyof typeof Permissions]];
export declare const ALL_PERMISSION_CODES: PermissionCode[];
