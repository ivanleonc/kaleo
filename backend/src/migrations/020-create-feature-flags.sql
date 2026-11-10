-- 020: Feature flags por empresa.
-- Permiten activar/desactivar capacidades sin desplegar código.
-- Convención de nombre: "modulo.feature" (ej. construction.apus_v2).
-- Re-ejecutable sin error.

CREATE TABLE IF NOT EXISTS public.feature_flags (
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    flag        text NOT NULL,
    enabled     boolean NOT NULL DEFAULT false,
    description text,
    created_at  timestamp with time zone NOT NULL DEFAULT now(),
    updated_at  timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, flag)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_company_enabled
    ON public.feature_flags (company_id)
    WHERE enabled = true;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

GRANT ALL ON TABLE public.feature_flags TO anon;
GRANT ALL ON TABLE public.feature_flags TO authenticated;
GRANT ALL ON TABLE public.feature_flags TO service_role;
