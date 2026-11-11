-- 063: Ejecución de obra (liviano): programación, contratos, nómina,
-- almacén y compras. Un módulo `construction.execution` con pestañas.

CREATE TABLE IF NOT EXISTS public.schedule_activities (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id     uuid NOT NULL,
    budget_item_id uuid,
    name           text NOT NULL,
    start_date     date,
    end_date       date,
    progress_pct   numeric(5,2) NOT NULL DEFAULT 0
        CHECK (progress_pct >= 0 AND progress_pct <= 100),
    predecessor_id uuid,
    status         text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
    notes          text,
    created_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    deleted_at     timestamptz,
    UNIQUE (company_id, id),
    FOREIGN KEY (company_id, project_id)
        REFERENCES public.projects(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, budget_item_id)
        REFERENCES public.budget_items(company_id, id) ON DELETE SET NULL,
    FOREIGN KEY (company_id, predecessor_id)
        REFERENCES public.schedule_activities(company_id, id) ON DELETE SET NULL,
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_schedule_activities_project
    ON public.schedule_activities (company_id, project_id, start_date)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.contracts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id    uuid NOT NULL,
    party_id      uuid,
    contract_type text NOT NULL DEFAULT 'obra'
        CHECK (contract_type IN ('obra', 'subcontrato', 'servicio', 'suministro', 'otro')),
    code          text NOT NULL,
    name          text NOT NULL,
    amount        numeric(18,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    currency_code char(3) NOT NULL REFERENCES public.currencies(code) ON DELETE RESTRICT,
    start_date    date,
    end_date      date,
    status        text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'completed', 'terminated')),
    notes         text,
    created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    UNIQUE (company_id, id),
    UNIQUE (company_id, project_id, code),
    FOREIGN KEY (company_id, project_id)
        REFERENCES public.projects(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, party_id)
        REFERENCES public.parties(company_id, id) ON DELETE SET NULL,
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_contracts_project
    ON public.contracts (company_id, project_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.payroll_entries (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id    uuid NOT NULL,
    membership_id uuid,
    worker_name   text NOT NULL,
    period_start  date NOT NULL,
    period_end    date NOT NULL,
    days          numeric(9,2) NOT NULL DEFAULT 0 CHECK (days >= 0),
    amount        numeric(18,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    currency_code char(3) NOT NULL REFERENCES public.currencies(code) ON DELETE RESTRICT,
    status        text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'paid', 'cancelled')),
    notes         text,
    created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    UNIQUE (company_id, id),
    FOREIGN KEY (company_id, project_id)
        REFERENCES public.projects(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, membership_id)
        REFERENCES public.memberships(company_id, id) ON DELETE SET NULL,
    CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_payroll_entries_project
    ON public.payroll_entries (company_id, project_id, period_start)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.warehouses (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id uuid,
    code       text NOT NULL,
    name       text NOT NULL,
    location   text,
    is_active  boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    UNIQUE (company_id, id),
    UNIQUE (company_id, code),
    FOREIGN KEY (company_id, project_id)
        REFERENCES public.projects(company_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    warehouse_id  uuid NOT NULL,
    resource_id   uuid NOT NULL,
    movement_type text NOT NULL
        CHECK (movement_type IN ('in', 'out', 'adjustment')),
    quantity      numeric(18,6) NOT NULL CHECK (quantity >= 0),
    unit_cost     numeric(18,6) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    occurred_at   timestamptz NOT NULL DEFAULT now(),
    reference     text,
    notes         text,
    created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id),
    FOREIGN KEY (company_id, warehouse_id)
        REFERENCES public.warehouses(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, resource_id)
        REFERENCES public.resources(company_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse
    ON public.stock_movements (company_id, warehouse_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_resource
    ON public.stock_movements (company_id, resource_id);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id        uuid NOT NULL,
    supplier_party_id uuid,
    code              text NOT NULL,
    status            text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
    currency_code     char(3) NOT NULL REFERENCES public.currencies(code) ON DELETE RESTRICT,
    notes             text,
    created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,
    UNIQUE (company_id, id),
    UNIQUE (company_id, project_id, code),
    FOREIGN KEY (company_id, project_id)
        REFERENCES public.projects(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, supplier_party_id)
        REFERENCES public.parties(company_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_project
    ON public.purchase_orders (company_id, project_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    purchase_order_id uuid NOT NULL,
    resource_id       uuid,
    description       text NOT NULL,
    quantity          numeric(18,6) NOT NULL CHECK (quantity > 0),
    unit_price        numeric(18,6) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id),
    FOREIGN KEY (company_id, purchase_order_id)
        REFERENCES public.purchase_orders(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, resource_id)
        REFERENCES public.resources(company_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_order
    ON public.purchase_order_lines (company_id, purchase_order_id);

DROP TRIGGER IF EXISTS trg_schedule_activities_updated_at ON public.schedule_activities;
CREATE TRIGGER trg_schedule_activities_updated_at
    BEFORE UPDATE ON public.schedule_activities
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON public.contracts;
CREATE TRIGGER trg_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_payroll_entries_updated_at ON public.payroll_entries;
CREATE TRIGGER trg_payroll_entries_updated_at
    BEFORE UPDATE ON public.payroll_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_warehouses_updated_at ON public.warehouses;
CREATE TRIGGER trg_warehouses_updated_at
    BEFORE UPDATE ON public.warehouses
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated_at
    BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_purchase_order_lines_updated_at ON public.purchase_order_lines;
CREATE TRIGGER trg_purchase_order_lines_updated_at
    BEFORE UPDATE ON public.purchase_order_lines
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.schedule_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schedule_activities_tenant_isolation ON public.schedule_activities;
CREATE POLICY schedule_activities_tenant_isolation ON public.schedule_activities
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS contracts_tenant_isolation ON public.contracts;
CREATE POLICY contracts_tenant_isolation ON public.contracts
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS payroll_entries_tenant_isolation ON public.payroll_entries;
CREATE POLICY payroll_entries_tenant_isolation ON public.payroll_entries
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS warehouses_tenant_isolation ON public.warehouses;
CREATE POLICY warehouses_tenant_isolation ON public.warehouses
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS stock_movements_tenant_isolation ON public.stock_movements;
CREATE POLICY stock_movements_tenant_isolation ON public.stock_movements
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS purchase_orders_tenant_isolation ON public.purchase_orders;
CREATE POLICY purchase_orders_tenant_isolation ON public.purchase_orders
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS purchase_order_lines_tenant_isolation ON public.purchase_order_lines;
CREATE POLICY purchase_order_lines_tenant_isolation ON public.purchase_order_lines
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

INSERT INTO public.modules (code, name, vertical, version, is_core, status)
VALUES ('construction.execution', 'Ejecución', 'construction', '1.0.0', false, 'active')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    vertical = EXCLUDED.vertical,
    is_core = EXCLUDED.is_core,
    status = EXCLUDED.status;

INSERT INTO public.plan_modules (plan_id, module_code)
SELECT p.id, 'construction.execution'
FROM public.plans p
WHERE p.code = 'core'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (code, module, name) VALUES
    ('construction.execution.read',   'execution', 'Ver programación, contratos, nómina, almacén y compras'),
    ('construction.execution.create', 'execution', 'Crear registros de ejecución'),
    ('construction.execution.update', 'execution', 'Editar registros de ejecución'),
    ('construction.execution.delete', 'execution', 'Eliminar registros de ejecución')
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
        'construction.execution.read',
        'construction.execution.create',
        'construction.execution.update',
        'construction.execution.delete'
    ))
    OR (r.name = 'Viewer' AND p.code = 'construction.execution.read')
  )
ON CONFLICT DO NOTHING;
