INSERT INTO permissions (code, module, name) VALUES
  ('analyses:read',   'analyses', 'Ver análisis'),
  ('analyses:create', 'analyses', 'Crear análisis'),
  ('analyses:update', 'analyses', 'Editar análisis'),
  ('analyses:delete', 'analyses', 'Eliminar análisis')
ON CONFLICT (code) DO UPDATE
SET module = EXCLUDED.module,
    name = EXCLUDED.name;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.company_id IS NULL
  AND r.name IN ('Owner', 'Admin')
  AND p.code LIKE 'analyses:%'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.company_id IS NULL
  AND r.name = 'Viewer'
  AND p.code = 'analyses:read'
ON CONFLICT DO NOTHING;
