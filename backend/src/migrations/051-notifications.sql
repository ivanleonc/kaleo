-- 051: Notificaciones in-app + preferencias por usuario.
--
-- La notificación es personal (usuario + empresa). El `type` describe el
-- evento (`operation.completed`, ...) y `category` agrupa las preferencias.
-- Las preferencias viven por empresa y usuario porque un mismo usuario puede
-- tener reglas distintas en cada organización.

CREATE TABLE IF NOT EXISTS public.notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type        text NOT NULL,
    category    text NOT NULL,
    title       text NOT NULL,
    body        text,
    link        text,
    data        jsonb NOT NULL DEFAULT '{}'::jsonb,
    read_at     timestamptz,
    emailed_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON public.notifications (company_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications (company_id, user_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category       text NOT NULL,
    in_app         boolean NOT NULL DEFAULT true,
    email_enabled  boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, user_id, category)
);

DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at
    ON public.notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_tenant_isolation ON public.notifications;
CREATE POLICY notifications_tenant_isolation ON public.notifications
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_preferences_tenant_isolation
    ON public.notification_preferences;
CREATE POLICY notification_preferences_tenant_isolation
    ON public.notification_preferences
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);

-- Catálogo del módulo. El registry lo vuelve a sincronizar al arrancar.
INSERT INTO public.modules (code, name, vertical, version, is_core, status)
VALUES ('core.notifications', 'Notificaciones', NULL, '1.0.0', true, 'active')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    is_core = EXCLUDED.is_core,
    status = EXCLUDED.status;

-- Las notificaciones son datos personales: se autorizan por JWT + membership,
-- no por un permiso RBAC. Cualquier miembro puede gestionar las suyas.
