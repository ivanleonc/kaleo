-- 059: construction.estimating — recursos, bases de APUs y APUs versionados.
--
-- `resources` son insumos de estimación (material, mano de obra, equipo,
-- transporte, subcontrato). `apu_bases` agrupa bibliotecas reutilizables y
-- `apus`/`apu_versions`/`apu_lines` modelan la composición versionada.

CREATE TABLE IF NOT EXISTS public.resources (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    resource_type   text NOT NULL
        CHECK (resource_type IN ('material', 'labor', 'equipment', 'transport', 'subcontract')),
    code            text NOT NULL,
    name            text NOT NULL,
    description     text,
    unit_id         uuid NOT NULL REFERENCES public.units_of_measure(id) ON DELETE RESTRICT,
    base_cost       numeric(18,6) NOT NULL DEFAULT 0 CHECK (base_cost >= 0),
    currency_code   char(3) NOT NULL REFERENCES public.currencies(code) ON DELETE RESTRICT,
    catalog_item_id uuid,
    is_active       boolean NOT NULL DEFAULT true,
    created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    UNIQUE (company_id, id),
    FOREIGN KEY (company_id, catalog_item_id)
        REFERENCES public.catalog_items(company_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_resources_code
    ON public.resources (company_id, lower(code))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_resources_company_type
    ON public.resources (company_id, resource_type)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.resource_prices (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    resource_id       uuid NOT NULL,
    supplier_party_id uuid,
    price             numeric(18,6) NOT NULL CHECK (price >= 0),
    currency_code     char(3) NOT NULL REFERENCES public.currencies(code) ON DELETE RESTRICT,
    valid_from        date,
    valid_to          date,
    source            text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id),
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from),
    FOREIGN KEY (company_id, resource_id)
        REFERENCES public.resources(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, supplier_party_id)
        REFERENCES public.parties(company_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_resource_prices_resource
    ON public.resource_prices (company_id, resource_id, valid_from DESC);

CREATE TABLE IF NOT EXISTS public.apu_bases (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code        text NOT NULL,
    name        text NOT NULL,
    description text,
    source      text,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz,
    UNIQUE (company_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_apu_bases_code
    ON public.apu_bases (company_id, lower(code))
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.apus (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id         uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    base_id            uuid NOT NULL,
    code               text NOT NULL,
    name               text NOT NULL,
    description        text,
    unit_id            uuid NOT NULL REFERENCES public.units_of_measure(id) ON DELETE RESTRICT,
    status             text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),
    current_version_id uuid,
    created_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    deleted_at         timestamptz,
    UNIQUE (company_id, id),
    UNIQUE (company_id, base_id, id),
    FOREIGN KEY (company_id, base_id)
        REFERENCES public.apu_bases(company_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_apus_code
    ON public.apus (company_id, base_id, lower(code))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_apus_base_status
    ON public.apus (company_id, base_id, status)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.apu_versions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    apu_id           uuid NOT NULL,
    version_number   integer NOT NULL CHECK (version_number > 0),
    status           text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'approved', 'superseded')),
    output_quantity  numeric(18,6) NOT NULL DEFAULT 1 CHECK (output_quantity > 0),
    performance      numeric(18,6),
    notes            text,
    approved_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at      timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id),
    UNIQUE (apu_id, version_number),
    FOREIGN KEY (company_id, apu_id)
        REFERENCES public.apus(company_id, id) ON DELETE CASCADE
);

ALTER TABLE public.apus
    DROP CONSTRAINT IF EXISTS fk_apus_current_version;
ALTER TABLE public.apus
    ADD CONSTRAINT fk_apus_current_version
    FOREIGN KEY (company_id, current_version_id)
    REFERENCES public.apu_versions(company_id, id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.apu_lines (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id         uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    apu_version_id     uuid NOT NULL,
    resource_id        uuid NOT NULL,
    component_type     text NOT NULL
        CHECK (component_type IN ('material', 'labor', 'equipment', 'transport', 'subcontract')),
    quantity           numeric(18,6) NOT NULL CHECK (quantity >= 0),
    waste_pct          numeric(9,4) NOT NULL DEFAULT 0 CHECK (waste_pct >= 0),
    performance        numeric(18,6) NOT NULL DEFAULT 1 CHECK (performance > 0),
    unit_cost_snapshot numeric(18,6) NOT NULL CHECK (unit_cost_snapshot >= 0),
    currency_code      char(3) NOT NULL REFERENCES public.currencies(code) ON DELETE RESTRICT,
    sort_order         integer NOT NULL DEFAULT 0,
    notes              text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id),
    FOREIGN KEY (company_id, apu_version_id)
        REFERENCES public.apu_versions(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, resource_id)
        REFERENCES public.resources(company_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_apu_lines_version
    ON public.apu_lines (company_id, apu_version_id, sort_order);

DROP TRIGGER IF EXISTS trg_resources_updated_at ON public.resources;
CREATE TRIGGER trg_resources_updated_at
    BEFORE UPDATE ON public.resources
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_apu_bases_updated_at ON public.apu_bases;
CREATE TRIGGER trg_apu_bases_updated_at
    BEFORE UPDATE ON public.apu_bases
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_apus_updated_at ON public.apus;
CREATE TRIGGER trg_apus_updated_at
    BEFORE UPDATE ON public.apus
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apu_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apu_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apu_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resources_tenant_isolation ON public.resources;
CREATE POLICY resources_tenant_isolation ON public.resources
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS resource_prices_tenant_isolation ON public.resource_prices;
CREATE POLICY resource_prices_tenant_isolation ON public.resource_prices
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS apu_bases_tenant_isolation ON public.apu_bases;
CREATE POLICY apu_bases_tenant_isolation ON public.apu_bases
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS apus_tenant_isolation ON public.apus;
CREATE POLICY apus_tenant_isolation ON public.apus
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS apu_versions_tenant_isolation ON public.apu_versions;
CREATE POLICY apu_versions_tenant_isolation ON public.apu_versions
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS apu_lines_tenant_isolation ON public.apu_lines;
CREATE POLICY apu_lines_tenant_isolation ON public.apu_lines
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

INSERT INTO public.modules (code, name, vertical, version, is_core, status)
VALUES ('construction.estimating', 'Estimación', 'construction', '1.0.0', false, 'active')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    vertical = EXCLUDED.vertical,
    is_core = EXCLUDED.is_core,
    status = EXCLUDED.status;

INSERT INTO public.plan_modules (plan_id, module_code)
SELECT p.id, 'construction.estimating'
FROM public.plans p
WHERE p.code = 'core'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (code, module, name) VALUES
    ('construction.estimating.read',   'estimating', 'Ver recursos, bases y APUs'),
    ('construction.estimating.create', 'estimating', 'Crear recursos, bases y APUs'),
    ('construction.estimating.update', 'estimating', 'Editar recursos, bases y APUs'),
    ('construction.estimating.delete', 'estimating', 'Eliminar recursos, bases y APUs')
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
        'construction.estimating.read',
        'construction.estimating.create',
        'construction.estimating.update',
        'construction.estimating.delete'
    ))
    OR (r.name = 'Viewer' AND p.code = 'construction.estimating.read')
  )
ON CONFLICT DO NOTHING;
