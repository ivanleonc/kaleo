-- 060: Presupuesto del proyecto y árbol WBS.
--
-- Un presupuesto por proyecto en esta fase. Los capítulos agrupan actividades;
-- las actividades pueden venir de un APU versionado o ser manuales.

CREATE TABLE IF NOT EXISTS public.budgets (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id      uuid NOT NULL,
    code            text NOT NULL,
    name            text NOT NULL,
    version         integer NOT NULL DEFAULT 1 CHECK (version > 0),
    status          text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'in_review', 'approved', 'superseded')),
    currency_code   char(3) NOT NULL REFERENCES public.currencies(code) ON DELETE RESTRICT,
    apu_base_id     uuid,
    indirect_pct    numeric(9,4) NOT NULL DEFAULT 0 CHECK (indirect_pct >= 0),
    indirect_fixed  numeric(18,2) NOT NULL DEFAULT 0 CHECK (indirect_fixed >= 0),
    subtotal        numeric(18,2) NOT NULL DEFAULT 0,
    indirect_total  numeric(18,2) NOT NULL DEFAULT 0,
    total           numeric(18,2) NOT NULL DEFAULT 0,
    approved_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at     timestamptz,
    created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    UNIQUE (company_id, id),
    FOREIGN KEY (company_id, project_id)
        REFERENCES public.projects(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, apu_base_id)
        REFERENCES public.apu_bases(company_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_project
    ON public.budgets (company_id, project_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.budget_items (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id             uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    budget_id              uuid NOT NULL,
    parent_id              uuid,
    code                   text NOT NULL,
    name                   text NOT NULL,
    item_type              text NOT NULL DEFAULT 'activity'
        CHECK (item_type IN ('chapter', 'activity')),
    unit_id                uuid REFERENCES public.units_of_measure(id) ON DELETE RESTRICT,
    quantity               numeric(18,6) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit_price             numeric(18,6) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    partial_amount         numeric(18,2) NOT NULL DEFAULT 0,
    apu_id                 uuid,
    apu_version_id         uuid,
    assigned_membership_id uuid,
    sort_order             integer NOT NULL DEFAULT 0,
    notes                  text,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id),
    UNIQUE (budget_id, code),
    FOREIGN KEY (company_id, budget_id)
        REFERENCES public.budgets(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, parent_id)
        REFERENCES public.budget_items(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, apu_id)
        REFERENCES public.apus(company_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (company_id, apu_version_id)
        REFERENCES public.apu_versions(company_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (company_id, assigned_membership_id)
        REFERENCES public.memberships(company_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget
    ON public.budget_items (company_id, budget_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_budget_items_parent
    ON public.budget_items (company_id, budget_id, parent_id);

CREATE TABLE IF NOT EXISTS public.budget_approvals (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    budget_id   uuid NOT NULL,
    approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at timestamptz NOT NULL DEFAULT now(),
    snapshot    jsonb NOT NULL DEFAULT '{}'::jsonb,
    FOREIGN KEY (company_id, budget_id)
        REFERENCES public.budgets(company_id, id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_budget_items_updated_at ON public.budget_items;
CREATE TRIGGER trg_budget_items_updated_at
    BEFORE UPDATE ON public.budget_items
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS budgets_tenant_isolation ON public.budgets;
CREATE POLICY budgets_tenant_isolation ON public.budgets
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS budget_items_tenant_isolation ON public.budget_items;
CREATE POLICY budget_items_tenant_isolation ON public.budget_items
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS budget_approvals_tenant_isolation ON public.budget_approvals;
CREATE POLICY budget_approvals_tenant_isolation ON public.budget_approvals
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

INSERT INTO public.permissions (code, module, name) VALUES
    ('construction.projects.budget.read',    'projects', 'Ver presupuesto del proyecto'),
    ('construction.projects.budget.update',  'projects', 'Editar presupuesto del proyecto'),
    ('construction.projects.budget.approve', 'projects', 'Aprobar presupuesto del proyecto')
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
        'construction.projects.budget.read',
        'construction.projects.budget.update',
        'construction.projects.budget.approve'
    ))
    OR (r.name = 'Viewer' AND p.code = 'construction.projects.budget.read')
  )
ON CONFLICT DO NOTHING;
