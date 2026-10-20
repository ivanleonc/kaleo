-- 018: Análisis persistidos de la empresa.
-- El resultado es específico del tipo (analysis_type); hoy solo 'energy'.

CREATE TABLE IF NOT EXISTS public.analyses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    created_by uuid,
    name character varying(160) NOT NULL,
    analysis_type character varying(40) NOT NULL,
    source character varying(20),
    file_name character varying(255),
    file_size bigint,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    result jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);

ALTER TABLE public.analyses OWNER TO postgres;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'analyses_pkey'
  ) THEN
    ALTER TABLE ONLY public.analyses
      ADD CONSTRAINT analyses_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_analyses_company'
  ) THEN
    ALTER TABLE ONLY public.analyses
      ADD CONSTRAINT fk_analyses_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_analyses_created_by'
  ) THEN
    ALTER TABLE ONLY public.analyses
      ADD CONSTRAINT fk_analyses_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'analyses_file_size_check'
  ) THEN
    ALTER TABLE ONLY public.analyses
      ADD CONSTRAINT analyses_file_size_check CHECK (file_size IS NULL OR file_size >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analyses_company_created
  ON public.analyses USING btree (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analyses_company_type
  ON public.analyses USING btree (company_id, analysis_type);

DROP TRIGGER IF EXISTS trg_analyses_updated_at ON public.analyses;
CREATE TRIGGER trg_analyses_updated_at
  BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.analyses TO anon;
GRANT ALL ON TABLE public.analyses TO authenticated;
GRANT ALL ON TABLE public.analyses TO service_role;
