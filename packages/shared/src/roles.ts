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
