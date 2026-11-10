-- 024: Invitaciones por email.
--
-- Reemplaza el alta directa de usuarios por email. La invitación guarda un
-- hash del token (nunca el token en claro), expira y se acepta una sola vez.
-- No revela si el email ya existe: el flujo de aceptación decide si crear
-- usuario o pedir login.

CREATE TABLE IF NOT EXISTS public.invitations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email       varchar(255) NOT NULL,
    name        varchar(255),
    token_hash  text NOT NULL UNIQUE,
    status      text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    invited_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
    expires_at  timestamptz NOT NULL,
    accepted_at timestamptz,
    accepted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id)
);

-- Una sola invitación pendiente por email y empresa.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitations_pending_email
    ON public.invitations (company_id, lower(email))
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_invitations_company_status
    ON public.invitations (company_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.invitation_roles (
    company_id    uuid NOT NULL,
    invitation_id uuid NOT NULL,
    role_id       uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (company_id, invitation_id, role_id),
    FOREIGN KEY (company_id, invitation_id)
        REFERENCES public.invitations (company_id, id) ON DELETE CASCADE
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitations_tenant_isolation ON public.invitations;
CREATE POLICY invitations_tenant_isolation ON public.invitations
    USING (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    )
    WITH CHECK (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    );

DROP POLICY IF EXISTS invitation_roles_tenant_isolation ON public.invitation_roles;
CREATE POLICY invitation_roles_tenant_isolation ON public.invitation_roles
    USING (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    )
    WITH CHECK (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    );

DROP TRIGGER IF EXISTS trg_invitations_updated_at ON public.invitations;
CREATE TRIGGER trg_invitations_updated_at
    BEFORE UPDATE ON public.invitations
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
