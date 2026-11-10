-- 034: Slug de empresa único solo entre empresas activas.
--
-- Un slug de una empresa con soft delete puede reutilizarse. La unicidad se
-- mantiene para las empresas vivas.

ALTER TABLE public.companies
    DROP CONSTRAINT IF EXISTS companies_slug_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_slug_active
    ON public.companies (slug)
    WHERE deleted_at IS NULL;
