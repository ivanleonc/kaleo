-- ============================================================
-- Migracion 010: Limpiar response_data bloat de logs de lectura
-- El interceptor以前 loggeaba GET /audit/logs con todo el
-- response_data, causando crecimiento exponencial.
-- Limpiamos response_data de requests GET (solo lectura).
-- ============================================================

UPDATE audit_logs SET response_data = NULL
WHERE action LIKE 'GET %' AND response_data IS NOT NULL;

UPDATE audit_logs SET response_data = NULL
WHERE action LIKE 'OPTIONS %' AND response_data IS NOT NULL;

UPDATE audit_logs SET response_data = NULL
WHERE action LIKE 'HEAD %' AND response_data IS NOT NULL;
