-- 053: Módulos core nuevos para el shell dinámico.
--
-- `syncCatalog` crea los manifests al arrancar, pero el plan core se sembró en
-- 041 y no incluía los módulos añadidos después. Los core no dependen del plan
-- para habilitarse, pero mantener `plan_modules` completo evita que el admin de
-- planes muestre un catálogo incompleto.

INSERT INTO public.modules (code, name, vertical, version, is_core, status)
VALUES
    ('core.operations', 'Operaciones', NULL, '1.0.0', true, 'active'),
    ('core.notifications', 'Notificaciones', NULL, '1.0.0', true, 'active')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    is_core = EXCLUDED.is_core,
    status = EXCLUDED.status;

INSERT INTO public.plan_modules (plan_id, module_code)
SELECT p.id, m.code
FROM public.plans p
CROSS JOIN (VALUES ('core.operations'), ('core.notifications')) AS m(code)
WHERE p.code = 'core'
ON CONFLICT DO NOTHING;
