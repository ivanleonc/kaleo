-- 050: Trial, downgrade y límite de usuarios.
--
-- `limit_kind` distingue límites de consumo (usage_counters) de límites de
-- valor actual (gauge), como cantidad de miembros activos.
-- El plan core queda con 14 días de trial para planes comerciales futuros.

ALTER TABLE public.plan_limits
    ADD COLUMN IF NOT EXISTS limit_kind text NOT NULL DEFAULT 'usage'
        CHECK (limit_kind IN ('usage', 'gauge'));

ALTER TABLE public.company_entitlements
    ADD COLUMN IF NOT EXISTS limit_kind text NOT NULL DEFAULT 'usage'
        CHECK (limit_kind IN ('usage', 'gauge'));

UPDATE public.plans
SET trial_days = 14
WHERE code = 'core' AND trial_days = 0;

INSERT INTO public.plan_limits
    (plan_id, module_code, feature_code, limit_value, period, is_hard, limit_kind)
SELECT id, 'core.users', 'max_active', 50, 'none', true, 'gauge'
FROM public.plans
WHERE code = 'core'
ON CONFLICT (plan_id, module_code, feature_code) DO UPDATE SET
    limit_value = EXCLUDED.limit_value,
    period = EXCLUDED.period,
    is_hard = EXCLUDED.is_hard,
    limit_kind = EXCLUDED.limit_kind;
