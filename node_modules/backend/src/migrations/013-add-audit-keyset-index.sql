-- ============================================================
-- Migracion 013: Indice de soporte para la paginacion por cursor de auditoria
-- Ejecutar en Supabase despues de la 012.
-- Re-ejecutable (IF NOT EXISTS).
-- ============================================================

-- La consulta de auditoria ahora ordena por (created_at DESC, id DESC) y
-- pagina con la comparacion de tuplas:
--
--   WHERE (al.created_at, al.id) < ($cursor_created_at, $cursor_id)
--   ORDER BY al.created_at DESC, al.id DESC
--
-- idx_audit_logs_company_created (company_id, created_at DESC) de la 009 cubre
-- empresa y fecha, pero no el id: PostgreSQL tiene que ordenar el grupo de
-- filas empatadas en created_at para cumplir el ORDER BY. Este indice cubre la
-- clave completa y resuelve esas filas ya ordenadas.
--
-- Sin este indice la consulta sigue siendo correcta, solo mas lenta.
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created_id
  ON audit_logs (company_id, created_at DESC, id DESC);
