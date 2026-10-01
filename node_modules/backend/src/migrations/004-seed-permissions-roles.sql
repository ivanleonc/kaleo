-- ============================================================
-- Migración 004: Seed completo de permisos y roles del sistema
-- Ejecutar después de 003-add-rbac-permissions.sql
-- ============================================================

-- 1. Insertar TODOS los permisos maestros
--    Si ya existen (por 003), se ignoran con ON CONFLICT
INSERT INTO permissions (code, module) VALUES
  -- Auth
  ('auth:read',                'auth'),
  ('auth:update',              'auth'),
  -- Users
  ('users:read',               'users'),
  ('users:create',             'users'),
  ('users:update',             'users'),
  ('users:delete',             'users'),
  -- Roles
  ('roles:read',               'roles'),
  ('roles:create',             'roles'),
  ('roles:update',             'roles'),
  ('roles:delete',             'roles'),
  -- Company
  ('company:read',             'company'),
  ('company:update',           'company'),
  -- Settings (NEW)
  ('settings:read',            'settings'),
  ('settings:update',          'settings'),
  -- Profile (NEW)
  ('profile:read',             'profile'),
  ('profile:update',           'profile'),
  -- Dashboard (NEW)
  ('dashboard:read',           'dashboard'),
  -- Branches (NEW)
  ('branches:read',            'branches'),
  ('branches:create',          'branches'),
  ('branches:update',          'branches'),
  ('branches:delete',          'branches'),
  -- Audit (NEW)
  ('audit:read',               'audit'),
  -- Billing (NEW)
  ('billing:read',             'billing'),
  ('billing:update',           'billing'),
  -- Notifications (NEW)
  ('notifications:read',       'notifications'),
  ('notifications:update',     'notifications'),
  -- Integrations (NEW)
  ('integrations:read',        'integrations'),
  ('integrations:update',      'integrations')
ON CONFLICT (code) DO NOTHING;

-- 2. Crear rol Owner global (si no existe) y asignar TODOS los permisos
DO $$
DECLARE
  owner_role_id UUID;
  perm_record RECORD;
BEGIN
  SELECT id INTO owner_role_id FROM roles WHERE name = 'Owner' AND company_id IS NULL LIMIT 1;

  IF owner_role_id IS NULL THEN
    INSERT INTO roles (name, company_id) VALUES ('Owner', NULL) RETURNING id INTO owner_role_id;
  END IF;

  FOR perm_record IN SELECT id FROM permissions LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (owner_role_id, perm_record.id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 3. Crear rol Admin global (si no existe) con permisos extendidos
DO $$
DECLARE
  admin_role_id UUID;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'Admin' AND company_id IS NULL LIMIT 1;

  IF admin_role_id IS NULL THEN
    INSERT INTO roles (name, company_id) VALUES ('Admin', NULL) RETURNING id INTO admin_role_id;
  END IF;

  -- Admin tiene todo excepto: users:delete, roles:create, roles:update, roles:delete
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT admin_role_id, id FROM permissions
  WHERE code NOT IN (
    'users:delete',
    'roles:create',
    'roles:update',
    'roles:delete'
  )
  ON CONFLICT DO NOTHING;
END $$;

-- 4. Crear rol Viewer global (solo lectura)
DO $$
DECLARE
  viewer_role_id UUID;
BEGIN
  SELECT id INTO viewer_role_id FROM roles WHERE name = 'Viewer' AND company_id IS NULL LIMIT 1;

  IF viewer_role_id IS NULL THEN
    INSERT INTO roles (name, company_id) VALUES ('Viewer', NULL) RETURNING id INTO viewer_role_id;
  END IF;

  -- Viewer tiene solo permisos de lectura
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT viewer_role_id, id FROM permissions
  WHERE code LIKE '%:read'
  ON CONFLICT DO NOTHING;
END $$;
