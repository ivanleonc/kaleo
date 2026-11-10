-- 042: Primer límite real del plan core.
--
-- Los análisis son una operación acotada y medible por mes. El valor es
-- deliberadamente holgado para no afectar uso normal; puede ajustarse por
-- plan o por override de empresa.
--
-- En una base nueva las migraciones corren sin arrancar la app, así que el
-- module registry todavía no sincronizó. Sembramos los core aquí antes de
-- crear el límite (la app luego hace upsert de los mismos manifests).

INSERT INTO public.modules (code, name, vertical, version, is_core, status) VALUES
    ('core.dashboard', 'Panel',                    NULL,    '1.0.0', true, 'active'),
    ('core.analyses',  'Analítica',                'energy','1.0.0', true, 'active'),
    ('core.users',     'Usuarios y miembros',      NULL,    '1.0.0', true, 'active'),
    ('core.branches',  'Sedes',                    NULL,    '1.0.0', true, 'active'),
    ('core.roles',     'Roles y permisos',         NULL,    '1.0.0', true, 'active'),
    ('core.audit',     'Auditoría',                NULL,    '1.0.0', true, 'active'),
    ('core.company',   'Empresa y configuración',  NULL,    '1.0.0', true, 'active'),
    ('core.features',  'Feature flags',            NULL,    '1.0.0', true, 'active')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.plan_modules (plan_id, module_code)
SELECT p.id, m.code
FROM public.plans p
CROSS JOIN public.modules m
WHERE p.code = 'core' AND m.is_core = true
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_limits
    (plan_id, module_code, feature_code, limit_value, period, is_hard)
SELECT id, 'core.analyses', 'create', 100, 'month', true
FROM public.plans
WHERE code = 'core'
ON CONFLICT (plan_id, module_code, feature_code) DO UPDATE SET
    limit_value = EXCLUDED.limit_value,
    period = EXCLUDED.period,
    is_hard = EXCLUDED.is_hard;
