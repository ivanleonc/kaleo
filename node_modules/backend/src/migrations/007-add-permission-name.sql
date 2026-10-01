-- ============================================================
-- Migracion 007: Agregar campo 'name' (nombre legible) a permisos
-- ============================================================

-- 1. Agregar columna con valor por defecto temporal
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'Sin nombre';

-- 2. Actualizar cada permiso con su nombre legible
UPDATE permissions SET name = 'Leer autenticacion' WHERE code = 'auth:read';
UPDATE permissions SET name = 'Actualizar autenticacion' WHERE code = 'auth:update';
UPDATE permissions SET name = 'Ver usuarios' WHERE code = 'users:read';
UPDATE permissions SET name = 'Crear usuarios' WHERE code = 'users:create';
UPDATE permissions SET name = 'Editar usuarios' WHERE code = 'users:update';
UPDATE permissions SET name = 'Eliminar usuarios' WHERE code = 'users:delete';
UPDATE permissions SET name = 'Ver roles' WHERE code = 'roles:read';
UPDATE permissions SET name = 'Crear roles' WHERE code = 'roles:create';
UPDATE permissions SET name = 'Editar roles' WHERE code = 'roles:update';
UPDATE permissions SET name = 'Eliminar roles' WHERE code = 'roles:delete';
UPDATE permissions SET name = 'Ver empresa' WHERE code = 'company:read';
UPDATE permissions SET name = 'Editar empresa' WHERE code = 'company:update';
UPDATE permissions SET name = 'Ver configuracion' WHERE code = 'settings:read';
UPDATE permissions SET name = 'Editar configuracion' WHERE code = 'settings:update';
UPDATE permissions SET name = 'Ver perfil' WHERE code = 'profile:read';
UPDATE permissions SET name = 'Editar perfil' WHERE code = 'profile:update';
UPDATE permissions SET name = 'Ver dashboard' WHERE code = 'dashboard:read';
UPDATE permissions SET name = 'Ver sedes' WHERE code = 'branches:read';
UPDATE permissions SET name = 'Crear sedes' WHERE code = 'branches:create';
UPDATE permissions SET name = 'Editar sedes' WHERE code = 'branches:update';
UPDATE permissions SET name = 'Eliminar sedes' WHERE code = 'branches:delete';
UPDATE permissions SET name = 'Ver auditoria' WHERE code = 'audit:read';
UPDATE permissions SET name = 'Ver facturacion' WHERE code = 'billing:read';
UPDATE permissions SET name = 'Editar facturacion' WHERE code = 'billing:update';
UPDATE permissions SET name = 'Ver notificaciones' WHERE code = 'notifications:read';
UPDATE permissions SET name = 'Editar notificaciones' WHERE code = 'notifications:update';
UPDATE permissions SET name = 'Ver integraciones' WHERE code = 'integrations:read';
UPDATE permissions SET name = 'Editar integraciones' WHERE code = 'integrations:update';

-- 3. Para permisos que no matchearon ningun WHERE, generar nombre desde el code
UPDATE permissions SET name = INITCAP(REPLACE(code, ':', ' - '))
WHERE name = 'Sin nombre' OR name IS NULL;

-- 4. Ahora sí, NOT NULL (ya todas las filas tienen valor)
ALTER TABLE permissions ALTER COLUMN name SET NOT NULL;
