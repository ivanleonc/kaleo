-- ============================================================
-- Migracion 009: Indices en audit_logs para consultas rapidas
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id
  ON audit_logs (company_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
  ON audit_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type
  ON audit_logs (entity_type);
