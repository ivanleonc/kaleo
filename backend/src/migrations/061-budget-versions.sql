-- 061: Versiones múltiples de presupuesto.
--
-- Antes había un único presupuesto activo por proyecto. Ahora cada proyecto
-- puede tener varias versiones numeradas; la más reciente es la de trabajo y
-- las aprobadas quedan como línea base comparable.

DROP INDEX IF EXISTS public.uq_budgets_project;

CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_project_version
    ON public.budgets (company_id, project_id, version)
    WHERE deleted_at IS NULL;

ALTER TABLE public.budgets
    ADD COLUMN IF NOT EXISTS label text;

CREATE INDEX IF NOT EXISTS idx_budgets_project_created
    ON public.budgets (company_id, project_id, created_at DESC)
    WHERE deleted_at IS NULL;
