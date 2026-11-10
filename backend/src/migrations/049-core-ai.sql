-- 049: core.ai skeleton (tools, runs, action requests) + permisos.
--
-- No ejecuta un LLM todavía. Define el catálogo de tools, el registro de runs
-- y el flujo HITL mínimo para tools de riesgo business_write/external.

CREATE TABLE IF NOT EXISTS public.ai_tools (
    code                  text PRIMARY KEY,
    module_code           text NOT NULL REFERENCES public.modules(code) ON DELETE CASCADE,
    name                  text NOT NULL,
    description           text,
    risk                  text NOT NULL
        CHECK (risk IN ('read', 'conversational', 'business_write', 'external')),
    requires_confirmation boolean NOT NULL DEFAULT false,
    permission            text,
    input_schema          jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active             boolean NOT NULL DEFAULT true,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_runs (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tool_code    text NOT NULL REFERENCES public.ai_tools(code) ON DELETE RESTRICT,
    status       text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'awaiting_confirmation', 'running', 'completed', 'rejected', 'failed')),
    input        jsonb NOT NULL DEFAULT '{}'::jsonb,
    output       jsonb,
    error        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.ai_action_requests (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    run_id       uuid NOT NULL REFERENCES public.ai_runs(id) ON DELETE CASCADE,
    tool_code    text NOT NULL REFERENCES public.ai_tools(code) ON DELETE RESTRICT,
    requested_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status       text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
    input        jsonb NOT NULL DEFAULT '{}'::jsonb,
    output       jsonb,
    error        text,
    approved_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at  timestamptz,
    executed_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_runs_company_created
    ON public.ai_runs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_company_status
    ON public.ai_action_requests (company_id, status);

DROP TRIGGER IF EXISTS trg_ai_tools_updated_at ON public.ai_tools;
CREATE TRIGGER trg_ai_tools_updated_at
    BEFORE UPDATE ON public.ai_tools
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.ai_tools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_tools_read ON public.ai_tools;
CREATE POLICY ai_tools_read ON public.ai_tools FOR SELECT USING (true);

ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_runs_tenant_isolation ON public.ai_runs;
CREATE POLICY ai_runs_tenant_isolation ON public.ai_runs
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.ai_action_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_action_requests_tenant_isolation ON public.ai_action_requests;
CREATE POLICY ai_action_requests_tenant_isolation ON public.ai_action_requests
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

INSERT INTO public.permissions (code, module, name) VALUES
    ('core.ai.read',    'ai', 'Usar herramientas de IA de lectura'),
    ('core.ai.run',     'ai', 'Ejecutar herramientas de IA'),
    ('core.ai.approve', 'ai', 'Aprobar acciones de IA (HITL)')
ON CONFLICT (code) DO UPDATE SET
    module = EXCLUDED.module,
    name = EXCLUDED.name;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.company_id IS NULL
  AND (
    (r.name IN ('Owner', 'Admin') AND p.code IN ('core.ai.read', 'core.ai.run', 'core.ai.approve'))
    OR (r.name = 'Viewer' AND p.code = 'core.ai.read')
  )
ON CONFLICT DO NOTHING;
