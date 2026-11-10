-- 023: UNIQUE (company_id, id) en tablas que serán padres de FKs compuestas.
--
-- Requisito de PostgreSQL: una FK compuesta necesita un UNIQUE en el destino.
-- Estas constraints no cambian el comportamiento actual (id ya es único), pero
-- preparan el terreno para que las tablas hijas referencien (company_id, id)
-- y la base impida vínculos cross-tenant.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'branches_company_id_id_key'
      AND n.nspname = 'public' AND t.relname = 'branches'
  ) THEN
    ALTER TABLE public.branches
      ADD CONSTRAINT branches_company_id_id_key UNIQUE (company_id, id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'roles_company_id_id_key'
      AND n.nspname = 'public' AND t.relname = 'roles'
  ) THEN
    ALTER TABLE public.roles
      ADD CONSTRAINT roles_company_id_id_key UNIQUE (company_id, id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'user_contexts_company_id_id_key'
      AND n.nspname = 'public' AND t.relname = 'user_contexts'
  ) THEN
    ALTER TABLE public.user_contexts
      ADD CONSTRAINT user_contexts_company_id_id_key UNIQUE (company_id, id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'analyses_company_id_id_key'
      AND n.nspname = 'public' AND t.relname = 'analyses'
  ) THEN
    ALTER TABLE public.analyses
      ADD CONSTRAINT analyses_company_id_id_key UNIQUE (company_id, id);
  END IF;
END $$;
