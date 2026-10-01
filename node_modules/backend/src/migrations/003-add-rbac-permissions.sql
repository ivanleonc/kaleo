-- ============================================================
-- Migración 003: RBAC con esquema existente en Supabase
-- permissions usa 'code' (no 'name')
-- roles pueden ser globales (company_id=NULL) o por empresa
-- ============================================================

-- 1. Insertar permisos maestros (usando 'code')
INSERT INTO permissions (code, module) VALUES
  ('auth:read',      'auth'),
  ('auth:update',    'auth'),
  ('users:read',     'users'),
  ('users:create',   'users'),
  ('users:update',   'users'),
  ('users:delete',   'users'),
  ('roles:read',     'roles'),
  ('roles:create',   'roles'),
  ('roles:update',   'roles'),
  ('roles:delete',   'roles'),
  ('company:read',   'company'),
  ('company:update', 'company')
ON CONFLICT (code) DO NOTHING;

-- 2. Asignar TODOS los permisos al rol Owner global (company_id = NULL)
DO $$
DECLARE
  owner_role_id UUID;
  perm_record RECORD;
BEGIN
  SELECT id INTO owner_role_id FROM roles WHERE name = 'Owner' AND company_id IS NULL LIMIT 1;

  IF owner_role_id IS NOT NULL THEN
    FOR perm_record IN SELECT id FROM permissions LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (owner_role_id, perm_record.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 3. Asignar permisos básicos al rol Admin global (company_id = NULL)
DO $$
DECLARE
  admin_role_id UUID;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'Admin' AND company_id IS NULL LIMIT 1;

  -- Crear Admin global si no existe
  IF admin_role_id IS NULL THEN
    INSERT INTO roles (name, company_id) VALUES ('Admin', NULL) RETURNING id INTO admin_role_id;
  END IF;

  IF admin_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT admin_role_id, id FROM permissions
    WHERE code IN (
      'auth:read', 'auth:update',
      'users:read', 'users:create', 'users:update',
      'roles:read',
      'company:read', 'company:update'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
