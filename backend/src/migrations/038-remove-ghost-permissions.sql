-- 038: Retirar permisos fantasma.
--
-- auth, profile, dashboard, settings, billing, notifications e integrations
-- no tienen endpoints que los exijan. Se eliminan para que el catálogo de
-- roles refleje permisos reales. Las asignaciones se limpian por la FK
-- ON DELETE CASCADE de role_permissions.

DELETE FROM public.permissions
WHERE module IN (
  'auth',
  'profile',
  'dashboard',
  'settings',
  'billing',
  'notifications',
  'integrations'
);
