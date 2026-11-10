-- 042: Primer límite real del plan core.
--
-- Los análisis son una operación acotada y medible por mes. El valor es
-- deliberadamente holgado para no afectar uso normal; puede ajustarse por
-- plan o por override de empresa.

INSERT INTO public.plan_limits
    (plan_id, module_code, feature_code, limit_value, period, is_hard)
SELECT id, 'core.analyses', 'create', 100, 'month', true
FROM public.plans
WHERE code = 'core'
ON CONFLICT (plan_id, module_code, feature_code) DO UPDATE SET
    limit_value = EXCLUDED.limit_value,
    period = EXCLUDED.period,
    is_hard = EXCLUDED.is_hard;
