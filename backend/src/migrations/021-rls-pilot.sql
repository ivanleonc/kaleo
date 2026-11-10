-- 021: Piloto de RLS con un rol de aplicación sin BYPASSRLS.
--
-- Objetivo: validar el patrón antes de extenderlo a todas las tablas.
-- La aplicación sigue conectando como `postgres` (BYPASSRLS); este rol se usa
-- para pruebas con `SET ROLE kaleo_app` y, más adelante, para migrar la app.
--
-- Regla de política:
--   company_id = current_setting('app.company_id', true)::uuid
-- Si `app.company_id` no está definido, la comparación es NULL y no devuelve filas.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kaleo_app') THEN
    CREATE ROLE kaleo_app NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
  ELSE
    ALTER ROLE kaleo_app NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO kaleo_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kaleo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kaleo_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO kaleo_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kaleo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO kaleo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO kaleo_app;

-- Permite probar con SET ROLE desde la conexión de migraciones.
GRANT kaleo_app TO postgres;

-- Piloto: branches.
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branches_tenant_isolation ON public.branches;
CREATE POLICY branches_tenant_isolation ON public.branches
  USING (company_id = current_setting('app.company_id', true)::uuid)
  WITH CHECK (company_id = current_setting('app.company_id', true)::uuid);
