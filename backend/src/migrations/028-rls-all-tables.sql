-- 028: Políticas RLS para todas las tablas de negocio.
--
-- La aplicación sigue conectando como `postgres` (BYPASSRLS); estas políticas
-- se validan con `SET ROLE kaleo_app`. El cambio de rol de la app será una
-- fase posterior, junto con las transacciones que setean app.company_id.
--
-- Contexto esperado:
--   set_config('app.company_id', '<uuid>', true)
--   set_config('app.user_id', '<uuid>', true)
--
-- Sin contexto, las políticas fallan cerradas (0 filas).

-- ─── Roles y permisos ──────────────────────────────────────────────────────
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roles_tenant_isolation ON public.roles;
CREATE POLICY roles_tenant_isolation ON public.roles
    USING (
        company_id IS NULL
        OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    )
    WITH CHECK (
        company_id IS NULL
        OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    );

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_permissions_tenant_isolation ON public.role_permissions;
CREATE POLICY role_permissions_tenant_isolation ON public.role_permissions
    USING (
        EXISTS (
            SELECT 1 FROM public.roles r
            WHERE r.id = role_permissions.role_id
              AND (
                  r.company_id IS NULL
                  OR r.company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.roles r
            WHERE r.id = role_permissions.role_id
              AND (
                  r.company_id IS NULL
                  OR r.company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
              )
        )
    );

-- Catálogo global: solo lectura para kaleo_app; escribe el seed/migraciones.
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS permissions_read ON public.permissions;
CREATE POLICY permissions_read ON public.permissions
    FOR SELECT
    USING (true);

-- ─── Usuarios y empresas ───────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_tenant_isolation ON public.users;
CREATE POLICY users_tenant_isolation ON public.users
    USING (
        id = NULLIF(current_setting('app.user_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.user_id = users.id
              AND m.company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
              AND m.status = 'active'
        )
    )
    WITH CHECK (
        id = NULLIF(current_setting('app.user_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.user_id = users.id
              AND m.company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
              AND m.status = 'active'
        )
    );

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS companies_tenant_isolation ON public.companies;
CREATE POLICY companies_tenant_isolation ON public.companies
    USING (
        id = NULLIF(current_setting('app.company_id', true), '')::uuid
        OR EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.company_id = companies.id
              AND m.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
              AND m.status = 'active'
        )
    )
    WITH CHECK (
        id = NULLIF(current_setting('app.company_id', true), '')::uuid
    );

-- ─── Tablas operativas por empresa ─────────────────────────────────────────
ALTER TABLE public.user_contexts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_contexts_tenant_isolation ON public.user_contexts;
CREATE POLICY user_contexts_tenant_isolation ON public.user_contexts
    USING (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    )
    WITH CHECK (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    );

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_tenant_isolation ON public.audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON public.audit_logs
    USING (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    )
    WITH CHECK (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    );

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS analyses_tenant_isolation ON public.analyses;
CREATE POLICY analyses_tenant_isolation ON public.analyses
    USING (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    )
    WITH CHECK (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    );

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS feature_flags_tenant_isolation ON public.feature_flags;
CREATE POLICY feature_flags_tenant_isolation ON public.feature_flags
    USING (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    )
    WITH CHECK (
        company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
    );
