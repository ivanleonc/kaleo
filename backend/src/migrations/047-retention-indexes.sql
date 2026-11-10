-- 047: Índices de retención para operaciones y jobs.

CREATE INDEX IF NOT EXISTS idx_operations_retention
    ON public.operations (completed_at)
    WHERE status IN ('ready', 'failed');

CREATE INDEX IF NOT EXISTS idx_jobs_retention
    ON public.jobs (updated_at)
    WHERE status IN ('completed', 'dead_letter');
