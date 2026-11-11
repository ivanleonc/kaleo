-- 052: Documentos con versiones, checksum y vínculos polimórficos.
--
-- La metadata vive en PostgreSQL y el binario en object storage (Supabase
-- Storage en producción, filesystem local en desarrollo). El backend autoriza
-- cada descarga y nunca expone URLs públicas.
--
-- `current_version` apunta a `document_versions.version`. Las versiones son
-- inmutables: subir una nueva crea otra fila y actualiza el puntero.
--
-- `document_links.entity_id` no tiene FK porque el destino es polimórfico
-- (analysis, member, branch, operation, ...). La integridad referencial del
-- vínculo la valida el servicio que lo crea.

CREATE TABLE IF NOT EXISTS public.documents (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    module_code     text NOT NULL DEFAULT 'shared.documents'
        REFERENCES public.modules(code) ON DELETE RESTRICT,
    title           text NOT NULL,
    description     text,
    category        text,
    status          text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
    created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id)
);

CREATE INDEX IF NOT EXISTS idx_documents_company_created
    ON public.documents (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_company_category
    ON public.documents (company_id, category)
    WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.document_versions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    document_id     uuid NOT NULL,
    version         integer NOT NULL CHECK (version > 0),
    storage_key     text NOT NULL UNIQUE,
    filename        text NOT NULL,
    content_type    text NOT NULL DEFAULT 'application/octet-stream',
    size_bytes      bigint NOT NULL CHECK (size_bytes >= 0),
    checksum_sha256 text NOT NULL CHECK (length(checksum_sha256) = 64),
    uploaded_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (document_id, version),
    FOREIGN KEY (company_id, document_id)
        REFERENCES public.documents(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document
    ON public.document_versions (document_id, version DESC);

CREATE TABLE IF NOT EXISTS public.document_links (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    document_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id   uuid NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, document_id, entity_type, entity_id),
    FOREIGN KEY (company_id, document_id)
        REFERENCES public.documents(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_links_entity
    ON public.document_links (company_id, entity_type, entity_id);

DROP TRIGGER IF EXISTS trg_documents_updated_at ON public.documents;
CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documents_tenant_isolation ON public.documents;
CREATE POLICY documents_tenant_isolation ON public.documents
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_versions_tenant_isolation ON public.document_versions;
CREATE POLICY document_versions_tenant_isolation ON public.document_versions
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.document_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_links_tenant_isolation ON public.document_links;
CREATE POLICY document_links_tenant_isolation ON public.document_links
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

-- Módulo shared: se incluye en el plan core mientras no exista un pack que lo
-- comercialice. Así todas las empresas con plan core lo ven habilitado.
INSERT INTO public.modules (code, name, vertical, version, is_core, status)
VALUES ('shared.documents', 'Documentos', NULL, '1.0.0', false, 'active')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    is_core = EXCLUDED.is_core,
    status = EXCLUDED.status;

INSERT INTO public.plan_modules (plan_id, module_code)
SELECT p.id, 'shared.documents'
FROM public.plans p
WHERE p.code = 'core'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (code, module, name) VALUES
    ('core.documents.read',   'documents', 'Ver y descargar documentos'),
    ('core.documents.create', 'documents', 'Subir documentos y versiones'),
    ('core.documents.update', 'documents', 'Editar metadata y vínculos de documentos'),
    ('core.documents.delete', 'documents', 'Eliminar documentos')
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
        'core.documents.read',
        'core.documents.create',
        'core.documents.update',
        'core.documents.delete'
    ))
    OR (r.name = 'Viewer' AND p.code = 'core.documents.read')
  )
ON CONFLICT DO NOTHING;
