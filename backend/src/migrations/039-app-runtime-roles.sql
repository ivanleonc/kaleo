-- 039: Roles de conexión para la aplicación.
--
-- `kaleo_runtime` es el rol por defecto del pool: hereda los grants de
-- `kaleo_app`, por lo que sin `SET LOCAL ROLE` las consultas de negocio quedan
-- sujetas a RLS y fallan cerradas sin contexto.
--
-- `kaleo_auth` es el rol del DataSource de autenticación/sistema: hereda los
-- mismos grants pero tiene BYPASSRLS para login, onboarding y auditoría.
--
-- Las contraseñas NO se escriben aquí. Se configuran con
-- `npm run db:set-app-passwords` leyendo KALEO_RUNTIME_PASSWORD y
-- KALEO_AUTH_PASSWORD.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kaleo_runtime') THEN
    CREATE ROLE kaleo_runtime LOGIN INHERIT NOSUPERUSER NOBYPASSRLS;
  ELSE
    ALTER ROLE kaleo_runtime LOGIN INHERIT NOSUPERUSER NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kaleo_auth') THEN
    CREATE ROLE kaleo_auth LOGIN INHERIT NOSUPERUSER BYPASSRLS;
  ELSE
    ALTER ROLE kaleo_auth LOGIN INHERIT NOSUPERUSER BYPASSRLS;
  END IF;
END $$;

GRANT kaleo_app TO kaleo_runtime;
GRANT kaleo_app TO kaleo_auth;
-- Permite que el runtime use SET LOCAL ROLE kaleo_auth si hiciera falta.
GRANT kaleo_auth TO kaleo_runtime;
