-- 055: shared.catalog — monedas, unidades de medida, conversiones e impuestos.
--
-- Las unidades globales (company_id NULL) son catálogo base reutilizable. Cada
-- empresa puede crear unidades propias sin pisar las globales. Los impuestos
-- son por empresa porque dependen de jurisdicción y configuración fiscal.

CREATE TABLE IF NOT EXISTS public.currencies (
    code           char(3) PRIMARY KEY,
    name           text NOT NULL,
    symbol         text NOT NULL,
    decimal_digits integer NOT NULL DEFAULT 2
        CHECK (decimal_digits BETWEEN 0 AND 4),
    is_active      boolean NOT NULL DEFAULT true
);

INSERT INTO public.currencies (code, name, symbol, decimal_digits) VALUES
    ('COP', 'Peso colombiano', '$', 2),
    ('USD', 'Dólar estadounidense', '$', 2),
    ('EUR', 'Euro', '€', 2),
    ('MXN', 'Peso mexicano', '$', 2),
    ('CLP', 'Peso chileno', '$', 0),
    ('PEN', 'Sol peruano', 'S/', 2),
    ('ARS', 'Peso argentino', '$', 2),
    ('BRL', 'Real brasileño', 'R$', 2)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    decimal_digits = EXCLUDED.decimal_digits;

CREATE TABLE IF NOT EXISTS public.units_of_measure (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    code        text NOT NULL,
    name        text NOT NULL,
    kind        text NOT NULL
        CHECK (kind IN ('length', 'area', 'volume', 'mass', 'quantity', 'time')),
    precision   integer NOT NULL DEFAULT 2 CHECK (precision BETWEEN 0 AND 8),
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz,
    UNIQUE (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_units_global_code
    ON public.units_of_measure (lower(code))
    WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_units_company_code
    ON public.units_of_measure (company_id, lower(code))
    WHERE company_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_units_company_kind
    ON public.units_of_measure (company_id, kind)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.unit_conversions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    from_unit_id  uuid NOT NULL REFERENCES public.units_of_measure(id) ON DELETE CASCADE,
    to_unit_id    uuid NOT NULL REFERENCES public.units_of_measure(id) ON DELETE CASCADE,
    factor        numeric(18,8) NOT NULL CHECK (factor > 0),
    created_at    timestamptz NOT NULL DEFAULT now(),
    CHECK (from_unit_id <> to_unit_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_unit_conversions_global
    ON public.unit_conversions (from_unit_id, to_unit_id)
    WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_unit_conversions_company
    ON public.unit_conversions (company_id, from_unit_id, to_unit_id)
    WHERE company_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.tax_rates (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code         text NOT NULL,
    name         text NOT NULL,
    rate         numeric(9,4) NOT NULL DEFAULT 0 CHECK (rate >= 0),
    country_code char(2),
    is_active    boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    deleted_at   timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tax_rates_company_code
    ON public.tax_rates (company_id, lower(code))
    WHERE deleted_at IS NULL;

INSERT INTO public.units_of_measure (company_id, code, name, kind, precision)
VALUES
    (NULL, 'mm', 'Milímetro', 'length', 2),
    (NULL, 'cm', 'Centímetro', 'length', 2),
    (NULL, 'm', 'Metro', 'length', 3),
    (NULL, 'km', 'Kilómetro', 'length', 3),
    (NULL, 'in', 'Pulgada', 'length', 3),
    (NULL, 'ft', 'Pie', 'length', 3),
    (NULL, 'cm2', 'Centímetro cuadrado', 'area', 2),
    (NULL, 'm2', 'Metro cuadrado', 'area', 4),
    (NULL, 'ft2', 'Pie cuadrado', 'area', 4),
    (NULL, 'ml', 'Mililitro', 'volume', 1),
    (NULL, 'l', 'Litro', 'volume', 3),
    (NULL, 'm3', 'Metro cúbico', 'volume', 4),
    (NULL, 'gal', 'Galón', 'volume', 4),
    (NULL, 'g', 'Gramo', 'mass', 2),
    (NULL, 'kg', 'Kilogramo', 'mass', 3),
    (NULL, 't', 'Tonelada', 'mass', 3),
    (NULL, 'lb', 'Libra', 'mass', 3),
    (NULL, 'un', 'Unidad', 'quantity', 0),
    (NULL, 'doc', 'Docena', 'quantity', 0),
    (NULL, 'hr', 'Hora', 'time', 2),
    (NULL, 'day', 'Día', 'time', 2),
    (NULL, 'month', 'Mes', 'time', 2)
ON CONFLICT DO NOTHING;

INSERT INTO public.unit_conversions (company_id, from_unit_id, to_unit_id, factor)
SELECT NULL, f.id, t.id, v.factor
FROM (VALUES
    ('m', 'cm', 100),
    ('m', 'mm', 1000),
    ('km', 'm', 1000),
    ('ft', 'in', 12),
    ('m2', 'cm2', 10000),
    ('m3', 'l', 1000),
    ('l', 'ml', 1000),
    ('kg', 'g', 1000),
    ('t', 'kg', 1000),
    ('lb', 'g', 453.59237),
    ('day', 'hr', 24)
) AS v(from_code, to_code, factor)
JOIN public.units_of_measure f
    ON f.company_id IS NULL AND f.code = v.from_code
JOIN public.units_of_measure t
    ON t.company_id IS NULL AND t.code = v.to_code
ON CONFLICT DO NOTHING;

DROP TRIGGER IF EXISTS trg_units_updated_at ON public.units_of_measure;
CREATE TRIGGER trg_units_updated_at
    BEFORE UPDATE ON public.units_of_measure
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_tax_rates_updated_at ON public.tax_rates;
CREATE TRIGGER trg_tax_rates_updated_at
    BEFORE UPDATE ON public.tax_rates
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS currencies_read ON public.currencies;
CREATE POLICY currencies_read ON public.currencies FOR SELECT USING (true);

ALTER TABLE public.units_of_measure ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS units_tenant_isolation ON public.units_of_measure;
CREATE POLICY units_tenant_isolation ON public.units_of_measure
    USING (
        company_id IS NULL
        OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    )
    WITH CHECK (
        company_id IS NULL
        OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    );

ALTER TABLE public.unit_conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unit_conversions_tenant_isolation ON public.unit_conversions;
CREATE POLICY unit_conversions_tenant_isolation ON public.unit_conversions
    USING (
        company_id IS NULL
        OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    )
    WITH CHECK (
        company_id IS NULL
        OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    );

ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tax_rates_tenant_isolation ON public.tax_rates;
CREATE POLICY tax_rates_tenant_isolation ON public.tax_rates
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

INSERT INTO public.modules (code, name, vertical, version, is_core, status)
VALUES ('shared.catalog', 'Catálogo', NULL, '1.0.0', false, 'active')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    is_core = EXCLUDED.is_core,
    status = EXCLUDED.status;

INSERT INTO public.plan_modules (plan_id, module_code)
SELECT p.id, 'shared.catalog'
FROM public.plans p
WHERE p.code = 'core'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (code, module, name) VALUES
    ('core.catalog.read',   'catalog', 'Ver catálogo, unidades e impuestos'),
    ('core.catalog.create', 'catalog', 'Crear unidades, conversiones e impuestos'),
    ('core.catalog.update', 'catalog', 'Editar unidades, conversiones e impuestos'),
    ('core.catalog.delete', 'catalog', 'Eliminar unidades e impuestos')
ON CONFLICT (code) DO UPDATE SET
    module = EXCLUDED.module,
    name = EXCLUDED.name;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.company_id IS NULL
  AND (
    (r.name IN ('Owner', 'Admin') AND p.code IN (
        'core.catalog.read',
        'core.catalog.create',
        'core.catalog.update',
        'core.catalog.delete'
    ))
    OR (r.name = 'Viewer' AND p.code = 'core.catalog.read')
  )
ON CONFLICT DO NOTHING;
