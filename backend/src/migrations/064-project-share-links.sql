-- 064: Enlaces de proyecto compartido (portal externo de solo lectura).
--
-- Cada enlace guarda el hash SHA-256 de un token aleatorio. El portal público
-- resuelve el token, verifica expiración/revocación y expone solo lectura del
-- proyecto (resumen o presupuesto completo según scope).

CREATE TABLE IF NOT EXISTS public.project_share_links (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id  uuid NOT NULL,
    token_hash  text NOT NULL,
    label       text,
    scope       text NOT NULL DEFAULT 'budget'
        CHECK (scope IN ('summary', 'budget')),
    expires_at  timestamptz,
    revoked_at  timestamptz,
    views_count integer NOT NULL DEFAULT 0,
    created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id),
    UNIQUE (token_hash),
    FOREIGN KEY (company_id, project_id)
        REFERENCES public.projects(company_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_share_links_project
    ON public.project_share_links (company_id, project_id);

DROP TRIGGER IF EXISTS trg_project_share_links_updated_at ON public.project_share_links;
CREATE TRIGGER trg_project_share_links_updated_at
    BEFORE UPDATE ON public.project_share_links
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.project_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_share_links_tenant_isolation ON public.project_share_links;
CREATE POLICY project_share_links_tenant_isolation ON public.project_share_links
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

INSERT INTO public.permissions (code, module, name) VALUES
    ('construction.projects.share', 'projects', 'Compartir proyectos con enlaces externos')
ON CONFLICT (code) DO UPDATE SET
    module = EXCLUDED.module,
    name = EXCLUDED.name;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.company_id IS NULL
  AND r.name IN ('Owner', 'Admin')
  AND p.code = 'construction.projects.share'
ON CONFLICT DO NOTHING;
