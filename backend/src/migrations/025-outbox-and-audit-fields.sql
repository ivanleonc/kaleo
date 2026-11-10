-- 025: Outbox de eventos y metadatos de auditoría.
--
-- outbox_events permite publicar eventos de dominio de forma asíncrona y
-- reintentable. Los eventos se escriben en la misma transacción que el cambio
-- de negocio (ver OutboxService.enqueue con QueryRunner).
--
-- audit_logs gana columnas para trazabilidad: módulo, origen, request-id,
-- correlación y actor. Son aditivas y nullable/default para no romper filas.

CREATE TABLE IF NOT EXISTS public.outbox_events (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id       uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    aggregate_type text NOT NULL,
    aggregate_id   uuid,
    event_type     text NOT NULL,
    payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
    occurred_at    timestamptz NOT NULL DEFAULT now(),
    published_at   timestamptz,
    attempts       integer NOT NULL DEFAULT 0,
    last_error     text,
    UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON public.outbox_events (occurred_at)
    WHERE published_at IS NULL;

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outbox_events_tenant_isolation ON public.outbox_events;
CREATE POLICY outbox_events_tenant_isolation ON public.outbox_events
    USING (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    )
    WITH CHECK (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    );

ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS module_code text,
    ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'api',
    ADD COLUMN IF NOT EXISTS request_id text,
    ADD COLUMN IF NOT EXISTS correlation_id uuid,
    ADD COLUMN IF NOT EXISTS actor_type text NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS actor_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_source_check'
    ) THEN
        ALTER TABLE public.audit_logs
            ADD CONSTRAINT audit_logs_source_check
            CHECK (source IN ('api', 'job', 'ai', 'system')) NOT VALID;
    END IF;
END $$;

ALTER TABLE public.audit_logs VALIDATE CONSTRAINT audit_logs_source_check;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_actor_type_check'
    ) THEN
        ALTER TABLE public.audit_logs
            ADD CONSTRAINT audit_logs_actor_type_check
            CHECK (actor_type IN ('user', 'bot', 'system', 'ai')) NOT VALID;
    END IF;
END $$;

ALTER TABLE public.audit_logs VALIDATE CONSTRAINT audit_logs_actor_type_check;
