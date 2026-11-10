-- 046: Operaciones asíncronas (exports, reports, imports).
--
-- Guarda el estado y el artefacto generado por un job. Los exports/reportes
-- viven en `data` (bytea); los imports guardan su resumen en `result`.

CREATE TABLE IF NOT EXISTS public.operations (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    kind         text NOT NULL CHECK (kind IN ('export', 'report', 'import')),
    resource     text NOT NULL,
    format       text,
    status       text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    filename     text,
    content_type text,
    data         bytea,
    result       jsonb,
    error        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_operations_company_created
    ON public.operations (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operations_pending
    ON public.operations (status)
    WHERE status IN ('pending', 'processing');

ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS operations_tenant_isolation ON public.operations;
CREATE POLICY operations_tenant_isolation ON public.operations
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
