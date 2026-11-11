-- 057: construction.projects.
--
-- Primer pack vertical: proyectos con cliente desde shared.parties y equipo
-- desde memberships. El proyecto es la raíz de APUs, presupuestos, takeoff y
-- costos en los siguientes bloques.

CREATE TABLE IF NOT EXISTS public.projects (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id       uuid,
    client_party_id uuid,
    code            text NOT NULL,
    name            text NOT NULL,
    description     text,
    status          text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'on_hold', 'completed', 'cancelled')),
    currency_code   char(3) NOT NULL REFERENCES public.currencies(code) ON DELETE RESTRICT,
    start_date      date,
    end_date        date,
    timezone        text,
    address         text,
    created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    UNIQUE (company_id, id),
    CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
    FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches(company_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (company_id, client_party_id)
        REFERENCES public.parties(company_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_code
    ON public.projects (company_id, lower(code))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_company_status
    ON public.projects (company_id, status, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_client
    ON public.projects (company_id, client_party_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_members (
    company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id   uuid NOT NULL,
    membership_id uuid NOT NULL,
    project_role text NOT NULL
        CHECK (project_role IN ('manager', 'estimator', 'resident', 'supervisor', 'viewer')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, membership_id),
    FOREIGN KEY (company_id, project_id)
        REFERENCES public.projects(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, membership_id)
        REFERENCES public.memberships(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_members_membership
    ON public.project_members (company_id, membership_id);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projects_tenant_isolation ON public.projects;
CREATE POLICY projects_tenant_isolation ON public.projects
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_members_tenant_isolation ON public.project_members;
CREATE POLICY project_members_tenant_isolation ON public.project_members
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

INSERT INTO public.modules (code, name, vertical, version, is_core, status)
VALUES ('construction.projects', 'Proyectos', 'construction', '1.0.0', false, 'active')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    vertical = EXCLUDED.vertical,
    is_core = EXCLUDED.is_core,
    status = EXCLUDED.status;

INSERT INTO public.plan_modules (plan_id, module_code)
SELECT p.id, 'construction.projects'
FROM public.plans p
WHERE p.code = 'core'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (code, module, name) VALUES
    ('construction.projects.read',   'projects', 'Ver proyectos'),
    ('construction.projects.create', 'projects', 'Crear proyectos'),
    ('construction.projects.update', 'projects', 'Editar proyectos y su equipo'),
    ('construction.projects.delete', 'projects', 'Eliminar proyectos')
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
        'construction.projects.read',
        'construction.projects.create',
        'construction.projects.update',
        'construction.projects.delete'
    ))
    OR (r.name = 'Viewer' AND p.code = 'construction.projects.read')
  )
ON CONFLICT DO NOTHING;
