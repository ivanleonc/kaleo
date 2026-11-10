-- 041: Planes, suscripciones, entitlements y usage.
--
-- Base para el enforcement server-side de Fase 2. El plan `core` se asigna a
-- las empresas existentes sin suscripción activa; los packs se añadirán
-- después vía `plan_modules` y `company_modules`.

CREATE TABLE IF NOT EXISTS public.plans (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code             text NOT NULL UNIQUE,
    name             text NOT NULL,
    trial_days       integer NOT NULL DEFAULT 0,
    billing_interval text NOT NULL DEFAULT 'month'
        CHECK (billing_interval IN ('month', 'year')),
    price            numeric(18,2) NOT NULL DEFAULT 0,
    currency_code    char(3) NOT NULL DEFAULT 'COP',
    is_active        boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_modules (
    plan_id     uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    module_code text NOT NULL REFERENCES public.modules(code) ON DELETE CASCADE,
    PRIMARY KEY (plan_id, module_code)
);

CREATE TABLE IF NOT EXISTS public.plan_limits (
    plan_id      uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    module_code  text NOT NULL REFERENCES public.modules(code) ON DELETE CASCADE,
    feature_code text NOT NULL,
    limit_value  numeric(18,2),
    period       text NOT NULL DEFAULT 'none'
        CHECK (period IN ('none', 'month', 'year')),
    is_hard      boolean NOT NULL DEFAULT true,
    PRIMARY KEY (plan_id, module_code, feature_code)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_id              uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    status               text NOT NULL DEFAULT 'active'
        CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'expired')),
    current_period_start timestamptz NOT NULL DEFAULT now(),
    current_period_end   timestamptz,
    provider             text,
    external_id          text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_active_company
    ON public.subscriptions (company_id)
    WHERE status IN ('trialing', 'active', 'past_due');

CREATE TABLE IF NOT EXISTS public.company_entitlements (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    module_code  text NOT NULL REFERENCES public.modules(code) ON DELETE CASCADE,
    feature_code text NOT NULL,
    limit_value  numeric(18,2),
    period       text NOT NULL DEFAULT 'none'
        CHECK (period IN ('none', 'month', 'year')),
    is_hard      boolean NOT NULL DEFAULT true,
    expires_at   timestamptz,
    reason       text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, module_code, feature_code)
);

CREATE TABLE IF NOT EXISTS public.usage_counters (
    company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    module_code  text NOT NULL REFERENCES public.modules(code) ON DELETE CASCADE,
    feature_code text NOT NULL,
    period_start date NOT NULL,
    used         numeric(18,2) NOT NULL DEFAULT 0,
    updated_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, module_code, feature_code, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_company_period
    ON public.usage_counters (company_id, period_start);

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plans_read ON public.plans;
CREATE POLICY plans_read ON public.plans FOR SELECT USING (true);

ALTER TABLE public.plan_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_modules_read ON public.plan_modules;
CREATE POLICY plan_modules_read ON public.plan_modules FOR SELECT USING (true);

ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_limits_read ON public.plan_limits;
CREATE POLICY plan_limits_read ON public.plan_limits FOR SELECT USING (true);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscriptions_tenant_isolation ON public.subscriptions;
CREATE POLICY subscriptions_tenant_isolation ON public.subscriptions
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.company_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_entitlements_tenant_isolation ON public.company_entitlements;
CREATE POLICY company_entitlements_tenant_isolation ON public.company_entitlements
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usage_counters_tenant_isolation ON public.usage_counters;
CREATE POLICY usage_counters_tenant_isolation ON public.usage_counters
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

-- Plan base: todos los módulos core, sin límites.
INSERT INTO public.plans (code, name, billing_interval, price, currency_code)
VALUES ('core', 'Core', 'month', 0, 'COP')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.plan_modules (plan_id, module_code)
SELECT p.id, m.code
FROM public.plans p
CROSS JOIN public.modules m
WHERE p.code = 'core' AND m.is_core = true
ON CONFLICT DO NOTHING;

INSERT INTO public.subscriptions (company_id, plan_id, status, current_period_start)
SELECT c.id, p.id, 'active', now()
FROM public.companies c
CROSS JOIN public.plans p
WHERE p.code = 'core'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.company_id = c.id
      AND s.status IN ('trialing', 'active', 'past_due')
  );
