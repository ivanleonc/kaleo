-- 037: Namespace de permisos core.*.
--
-- Migra `module:action` a `core.module.action`. Las asignaciones no cambian
-- porque `role_permissions` referencia IDs; solo cambia el código visible.
--
-- Se incrementa token_version de todas las memberships para que el próximo
-- request refresque claims y no quede una ventana con códigos viejos.

UPDATE public.permissions
SET code = 'core.' || replace(code, ':', '.')
WHERE code LIKE '%:%' AND code NOT LIKE 'core.%';

UPDATE public.memberships
SET token_version = token_version + 1;
