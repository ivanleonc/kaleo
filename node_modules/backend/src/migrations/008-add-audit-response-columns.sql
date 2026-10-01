-- ============================================================
-- Migracion 008: Agregar response_status, response_data y duration_ms
-- En tablas particionadas, solo se ALTER la tabla padre
-- ============================================================

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS response_status INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS response_data JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
