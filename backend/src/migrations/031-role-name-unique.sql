-- 031: Nombres de rol únicos por empresa (case-insensitive).
--
-- El servicio ya valida duplicados, pero sin constraint dos requests
-- concurrentes pueden crear el mismo nombre. Los roles globales tienen su
-- propio namespace.

CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_company_name_ci
    ON public.roles (company_id, lower(name))
    WHERE company_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_global_name_ci
    ON public.roles (lower(name))
    WHERE company_id IS NULL AND deleted_at IS NULL;
