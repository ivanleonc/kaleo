-- 043: Configuración tipada por empresa.
--
-- Preferencias globales que no pertenecen al perfil fiscal de `companies`:
-- moneda, locale y un objeto extensible para configuración futura.
-- Un trigger crea la fila automáticamente para empresas nuevas.

CREATE TABLE IF NOT EXISTS public.company_settings (
    company_id    uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    currency_code char(3) NOT NULL DEFAULT 'COP',
    locale        text NOT NULL DEFAULT 'es-CO',
    settings      jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.company_settings (company_id)
SELECT id FROM public.companies
ON CONFLICT (company_id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER trg_company_settings_updated_at
    BEFORE UPDATE ON public.company_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE OR REPLACE FUNCTION public.create_company_settings()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.company_settings (company_id)
    VALUES (NEW.id)
    ON CONFLICT (company_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_create_settings ON public.companies;
CREATE TRIGGER trg_companies_create_settings
    AFTER INSERT ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.create_company_settings();

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_settings_tenant_isolation ON public.company_settings;
CREATE POLICY company_settings_tenant_isolation ON public.company_settings
    USING (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid)
    WITH CHECK (company_id = NULLIF(current_setting('app.company_id', true), '')::uuid);
