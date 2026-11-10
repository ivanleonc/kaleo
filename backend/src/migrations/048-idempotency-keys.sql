-- 048: Idempotency-Key para POST.
--
-- Guarda la respuesta de un POST idempotente para reproducirla si el cliente
-- reintenta con la misma clave. La clave es por empresa + usuario.

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    idempotency_key  text NOT NULL,
    scope            text NOT NULL,
    request_hash     text NOT NULL,
    status           text NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'completed')),
    response_status  integer,
    response_body    jsonb,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    expires_at       timestamptz NOT NULL DEFAULT now() + interval '24 hours',
    UNIQUE (company_id, user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires
    ON public.idempotency_keys (expires_at);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS idempotency_keys_tenant_isolation ON public.idempotency_keys;
CREATE POLICY idempotency_keys_tenant_isolation ON public.idempotency_keys
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
