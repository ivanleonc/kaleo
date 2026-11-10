-- 040: Module registry.
--
-- Manifests en código + catálogo en base. Los módulos `core.*` son always-on;
-- `company_modules` habilita módulos shared/pack por empresa.

CREATE TABLE IF NOT EXISTS public.modules (
    code       text PRIMARY KEY,
    name       text NOT NULL,
    vertical   text,
    version    text NOT NULL DEFAULT '1.0.0',
    is_core    boolean NOT NULL DEFAULT false,
    status     text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'beta', 'deprecated', 'disabled')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.module_dependencies (
    module_code            text NOT NULL REFERENCES public.modules(code) ON DELETE CASCADE,
    depends_on_module_code text NOT NULL REFERENCES public.modules(code) ON DELETE RESTRICT,
    PRIMARY KEY (module_code, depends_on_module_code),
    CHECK (module_code <> depends_on_module_code)
);

CREATE TABLE IF NOT EXISTS public.company_modules (
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    module_code text NOT NULL REFERENCES public.modules(code) ON DELETE RESTRICT,
    status      text NOT NULL DEFAULT 'enabled'
        CHECK (status IN ('enabled', 'disabled', 'trial', 'read_only')),
    enabled_at  timestamptz,
    disabled_at timestamptz,
    config      jsonb NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (company_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_company_modules_module
    ON public.company_modules (module_code);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS modules_read ON public.modules;
CREATE POLICY modules_read ON public.modules
    FOR SELECT USING (true);

ALTER TABLE public.module_dependencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS module_dependencies_read ON public.module_dependencies;
CREATE POLICY module_dependencies_read ON public.module_dependencies
    FOR SELECT USING (true);

ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_modules_tenant_isolation ON public.company_modules;
CREATE POLICY company_modules_tenant_isolation ON public.company_modules
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
