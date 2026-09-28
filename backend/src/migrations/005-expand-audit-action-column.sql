-- Increase audit_logs.action from VARCHAR(50) to VARCHAR(255)
-- The interceptor generates actions like "PUT /api/companies/:id" which can exceed 50 chars
--
-- NOTA: en tablas particionadas el ALTER a la tabla PADRE se propaga solo
-- a todas las particiones. No alterar particiones por nombre (frágil y falla
-- si la partición no existe). Re-ejecutable sin efectos.

DO $$
DECLARE
  current_len INTEGER;
BEGIN
  SELECT character_maximum_length INTO current_len
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
    AND column_name = 'action';

  IF current_len IS DISTINCT FROM 255 THEN
    ALTER TABLE audit_logs ALTER COLUMN action TYPE VARCHAR(255);
  END IF;
END $$;
