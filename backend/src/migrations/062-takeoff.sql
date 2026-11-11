-- 062: Takeoff / memoria de cantidades.
--
-- Una hoja de takeoff pertenece a un proyecto y opcionalmente a una actividad
-- del presupuesto. Las líneas guardan dimensiones y calculan la cantidad; el
-- total por unidad se puede aplicar a una actividad.

CREATE TABLE IF NOT EXISTS public.takeoff_sheets (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id    uuid NOT NULL,
    budget_item_id uuid,
    name          text NOT NULL,
    description   text,
    status        text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'confirmed')),
    created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    UNIQUE (company_id, id),
    FOREIGN KEY (company_id, project_id)
        REFERENCES public.projects(company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, budget_item_id)
        REFERENCES public.budget_items(company_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_takeoff_sheets_project
    ON public.takeoff_sheets (company_id, project_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.takeoff_lines (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sheet_id    uuid NOT NULL,
    description text NOT NULL,
    unit_id     uuid NOT NULL REFERENCES public.units_of_measure(id) ON DELETE RESTRICT,
    parts       numeric(18,6) NOT NULL DEFAULT 1 CHECK (parts > 0),
    length      numeric(18,6) NOT NULL DEFAULT 0 CHECK (length >= 0),
    width       numeric(18,6) NOT NULL DEFAULT 0 CHECK (width >= 0),
    height      numeric(18,6) NOT NULL DEFAULT 0 CHECK (height >= 0),
    quantity    numeric(18,6) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    notes       text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id),
    FOREIGN KEY (company_id, sheet_id)
        REFERENCES public.takeoff_sheets(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_takeoff_lines_sheet
    ON public.takeoff_lines (company_id, sheet_id);

DROP TRIGGER IF EXISTS trg_takeoff_sheets_updated_at ON public.takeoff_sheets;
CREATE TRIGGER trg_takeoff_sheets_updated_at
    BEFORE UPDATE ON public.takeoff_sheets
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.takeoff_sheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS takeoff_sheets_tenant_isolation ON public.takeoff_sheets;
CREATE POLICY takeoff_sheets_tenant_isolation ON public.takeoff_sheets
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.takeoff_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS takeoff_lines_tenant_isolation ON public.takeoff_lines;
CREATE POLICY takeoff_lines_tenant_isolation ON public.takeoff_lines
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
