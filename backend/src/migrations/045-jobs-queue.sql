-- 045: Cola de jobs genérica sobre PostgreSQL.
--
-- Equivalente propio a pg-boss para imports, exports, emails y reportes.
-- Usa FOR UPDATE SKIP LOCKED, backoff, dead-letter y recuperación de jobs
-- huérfanos.

CREATE TABLE IF NOT EXISTS public.jobs (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    queue        text NOT NULL,
    payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
    status       text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'dead_letter')),
    run_at       timestamptz NOT NULL DEFAULT now(),
    attempts     integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 5,
    locked_at    timestamptz,
    locked_by    text,
    last_error   text,
    completed_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_pending
    ON public.jobs (run_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_jobs_company_status
    ON public.jobs (company_id, status);

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON public.jobs;
CREATE TRIGGER trg_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jobs_tenant_isolation ON public.jobs;
CREATE POLICY jobs_tenant_isolation ON public.jobs
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
