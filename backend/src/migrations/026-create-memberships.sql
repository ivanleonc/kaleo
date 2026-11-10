-- 026: Memberships, roles y sedes.
--
-- Fase no destructiva: crea el modelo objetivo y hace backfill desde
-- user_contexts. La aplicación sigue leyendo user_contexts hasta que se
-- migren auth/guards/repositorios en una fase posterior.
--
-- Relación:
--   memberships (1 por user/company)
--     ├── membership_roles (N roles)
--     └── membership_branches (N sedes)

CREATE TABLE IF NOT EXISTS public.memberships (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status     text NOT NULL DEFAULT 'active'
        CHECK (status IN ('invited', 'active', 'inactive')),
    joined_at  timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, user_id),
    UNIQUE (company_id, id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_company_status
    ON public.memberships (company_id, status);

CREATE TABLE IF NOT EXISTS public.membership_roles (
    company_id    uuid NOT NULL,
    membership_id uuid NOT NULL,
    role_id       uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    PRIMARY KEY (company_id, membership_id, role_id),
    FOREIGN KEY (company_id, membership_id)
        REFERENCES public.memberships (company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_membership_roles_role
    ON public.membership_roles (company_id, role_id);

CREATE TABLE IF NOT EXISTS public.membership_branches (
    company_id    uuid NOT NULL,
    membership_id uuid NOT NULL,
    branch_id     uuid NOT NULL,
    PRIMARY KEY (company_id, membership_id, branch_id),
    FOREIGN KEY (company_id, membership_id)
        REFERENCES public.memberships (company_id, id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, branch_id)
        REFERENCES public.branches (company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_membership_branches_branch
    ON public.membership_branches (company_id, branch_id);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memberships_tenant_isolation ON public.memberships;
CREATE POLICY memberships_tenant_isolation ON public.memberships
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS membership_roles_tenant_isolation ON public.membership_roles;
CREATE POLICY membership_roles_tenant_isolation ON public.membership_roles
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP POLICY IF EXISTS membership_branches_tenant_isolation ON public.membership_branches;
CREATE POLICY membership_branches_tenant_isolation ON public.membership_branches
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

DROP TRIGGER IF EXISTS trg_memberships_updated_at ON public.memberships;
CREATE TRIGGER trg_memberships_updated_at
    BEFORE UPDATE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Backfill desde el modelo plano actual.
INSERT INTO public.memberships (company_id, user_id, status, joined_at)
SELECT
    company_id,
    user_id,
    'active',
    COALESCE(MIN(created_at), now())
FROM public.user_contexts
GROUP BY company_id, user_id
ON CONFLICT (company_id, user_id) DO NOTHING;

INSERT INTO public.membership_roles (company_id, membership_id, role_id)
SELECT DISTINCT
    uc.company_id,
    m.id,
    uc.role_id
FROM public.user_contexts uc
INNER JOIN public.memberships m
    ON m.company_id = uc.company_id AND m.user_id = uc.user_id
ON CONFLICT DO NOTHING;

INSERT INTO public.membership_branches (company_id, membership_id, branch_id)
SELECT DISTINCT
    uc.company_id,
    m.id,
    uc.branch_id
FROM public.user_contexts uc
INNER JOIN public.memberships m
    ON m.company_id = uc.company_id AND m.user_id = uc.user_id
WHERE uc.branch_id IS NOT NULL
ON CONFLICT DO NOTHING;
