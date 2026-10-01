-- Branches table with extended location fields
-- company_id FK already exists from 003 migration

CREATE TABLE IF NOT EXISTS public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    address character varying(255),
    city character varying(100),
    state character varying(100),
    country character varying(100),
    postal_code character varying(20),
    phone character varying(30),
    email character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

ALTER TABLE public.branches OWNER TO postgres;

-- Constraints (con guards: ADD CONSTRAINT no soporta IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'branches_pkey'
  ) THEN
    ALTER TABLE ONLY public.branches
      ADD CONSTRAINT branches_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_branches_company_id ON public.branches USING btree (company_id);

-- FK (con guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_branches_company'
  ) THEN
    ALTER TABLE ONLY public.branches
      ADD CONSTRAINT fk_branches_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_branches_updated_at ON public.branches;
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- NOTA: los permisos branches:* ya los siembra 004 con (code, module).
-- No duplicar aquí: el INSERT anterior usaba (name, module) sin code
-- (columna NOT NULL) y ON CONFLICT (name) sin índice único -> siempre error.

-- Grant access
GRANT ALL ON TABLE public.branches TO anon;
GRANT ALL ON TABLE public.branches TO authenticated;
GRANT ALL ON TABLE public.branches TO service_role;
