-- 054: shared.parties.
--
-- Fuente única de personas y organizaciones para construcción, CRM, bots y
-- documentos. Las identidades de canal viven aquí, no en cada pack.
--
-- `party_identities` tiene unique por (company_id, kind, normalized_value):
-- dos canales que representan el mismo email/teléfono resuelven a la misma
-- party y los paquetes pueden hacer upsert idempotente.

CREATE TABLE IF NOT EXISTS public.parties (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    party_type  text NOT NULL CHECK (party_type IN ('person', 'organization')),
    name        text NOT NULL,
    legal_name  text,
    tax_id      text,
    email       text,
    phone       text,
    status      text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz,
    UNIQUE (company_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_parties_tax_id
    ON public.parties (company_id, lower(tax_id))
    WHERE tax_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_parties_company_name
    ON public.parties (company_id, name)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_parties_company_status
    ON public.parties (company_id, status)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.party_roles (
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    party_id   uuid NOT NULL,
    role       text NOT NULL
        CHECK (role IN ('customer', 'supplier', 'contractor', 'employee', 'contact')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (party_id, role),
    FOREIGN KEY (company_id, party_id)
        REFERENCES public.parties(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_party_roles_company_role
    ON public.party_roles (company_id, role);

CREATE TABLE IF NOT EXISTS public.party_identities (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    party_id         uuid NOT NULL,
    kind             text NOT NULL
        CHECK (kind IN ('email', 'phone', 'whatsapp', 'telegram', 'web', 'external')),
    value            text NOT NULL,
    normalized_value text NOT NULL,
    is_verified      boolean NOT NULL DEFAULT false,
    source_module    text NOT NULL DEFAULT 'shared.parties',
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, kind, normalized_value),
    FOREIGN KEY (company_id, party_id)
        REFERENCES public.parties(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_party_identities_party
    ON public.party_identities (company_id, party_id);

CREATE TABLE IF NOT EXISTS public.party_contacts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    party_id    uuid NOT NULL,
    name        text NOT NULL,
    role_title  text,
    email       text,
    phone       text,
    is_primary  boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (company_id, party_id)
        REFERENCES public.parties(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_party_contacts_party
    ON public.party_contacts (company_id, party_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_party_contacts_primary
    ON public.party_contacts (company_id, party_id)
    WHERE is_primary;

CREATE TABLE IF NOT EXISTS public.party_addresses (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    party_id    uuid NOT NULL,
    label       text,
    address     text NOT NULL,
    city        text,
    state       text,
    country     text,
    postal_code text,
    is_primary  boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (company_id, party_id)
        REFERENCES public.parties(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_party_addresses_party
    ON public.party_addresses (company_id, party_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_party_addresses_primary
    ON public.party_addresses (company_id, party_id)
    WHERE is_primary;

DROP TRIGGER IF EXISTS trg_parties_updated_at ON public.parties;
CREATE TRIGGER trg_parties_updated_at
    BEFORE UPDATE ON public.parties
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_party_contacts_updated_at ON public.party_contacts;
CREATE TRIGGER trg_party_contacts_updated_at
    BEFORE UPDATE ON public.party_contacts
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_party_addresses_updated_at ON public.party_addresses;
CREATE TRIGGER trg_party_addresses_updated_at
    BEFORE UPDATE ON public.party_addresses
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parties_tenant_isolation ON public.parties;
CREATE POLICY parties_tenant_isolation ON public.parties
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.party_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS party_roles_tenant_isolation ON public.party_roles;
CREATE POLICY party_roles_tenant_isolation ON public.party_roles
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.party_identities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS party_identities_tenant_isolation ON public.party_identities;
CREATE POLICY party_identities_tenant_isolation ON public.party_identities
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.party_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS party_contacts_tenant_isolation ON public.party_contacts;
CREATE POLICY party_contacts_tenant_isolation ON public.party_contacts
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.party_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS party_addresses_tenant_isolation ON public.party_addresses;
CREATE POLICY party_addresses_tenant_isolation ON public.party_addresses
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

INSERT INTO public.modules (code, name, vertical, version, is_core, status)
VALUES ('shared.parties', 'Terceros', NULL, '1.0.0', false, 'active')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    is_core = EXCLUDED.is_core,
    status = EXCLUDED.status;

INSERT INTO public.plan_modules (plan_id, module_code)
SELECT p.id, 'shared.parties'
FROM public.plans p
WHERE p.code = 'core'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (code, module, name) VALUES
    ('core.parties.read',   'parties', 'Ver personas y organizaciones'),
    ('core.parties.create', 'parties', 'Crear personas y organizaciones'),
    ('core.parties.update', 'parties', 'Editar personas, contactos y direcciones'),
    ('core.parties.delete', 'parties', 'Eliminar personas y organizaciones')
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
        'core.parties.read',
        'core.parties.create',
        'core.parties.update',
        'core.parties.delete'
    ))
    OR (r.name = 'Viewer' AND p.code = 'core.parties.read')
  )
ON CONFLICT DO NOTHING;
