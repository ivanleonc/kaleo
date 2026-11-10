export declare const SystemRoles: {
    readonly OWNER: "Owner";
    readonly ADMIN: "Admin";
    readonly VIEWER: "Viewer";
};
export type SystemRoleName = (typeof SystemRoles)[keyof typeof SystemRoles];
export declare const PROTECTED_ROLES: readonly SystemRoleName[];
export declare const IMMUTABLE_ROLES: readonly SystemRoleName[];
