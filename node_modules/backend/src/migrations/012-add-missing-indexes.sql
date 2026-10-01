-- ============================================================
-- Migracion 012: Indices faltantes detectados en auditoria de rendimiento
-- Todos con IF NOT EXISTS: re-ejecutable sin errores.
-- Ejecutar en Supabase despues de la 011.
-- ============================================================

-- 1. ALTO: búsquedas de miembros por empresa.
--    idx_user_contexts_lookup(user_id, company_id) no sirve cuando el
--    filtro es solo company_id (leftmost user_id).
CREATE INDEX IF NOT EXISTS idx_user_contexts_company_id
  ON user_contexts (company_id);

-- 2. MEDIO: JOINs de roles en listados de miembros y permisos.
CREATE INDEX IF NOT EXISTS idx_user_contexts_role_id
  ON user_contexts (role_id);

-- 3. MEDIO: conteo de miembros por sede al eliminar (softDelete).
CREATE INDEX IF NOT EXISTS idx_user_contexts_branch_id
  ON user_contexts (branch_id)
  WHERE branch_id IS NOT NULL;

-- 4. MEDIO: verificación de email por token.
CREATE INDEX IF NOT EXISTS idx_users_verification_token
  ON users (email_verification_token)
  WHERE email_verification_token IS NOT NULL;

-- 5. BAJO-MEDIO: JOIN inverso permission_id en role_permissions.
--    La PK solo indexa desde role_id.
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id
  ON role_permissions (permission_id);

-- 6. BAJO: búsquedas de roles del sistema por nombre.
CREATE INDEX IF NOT EXISTS idx_roles_name
  ON roles (name)
  WHERE deleted_at IS NULL;
