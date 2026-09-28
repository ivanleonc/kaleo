-- ============================================================
-- Baseline 000: esquema public extraído del backup de producción.
-- Generado automáticamente: NO EDITAR A MANO.
-- Para una BD nueva: correr 000 y luego deltas 002..011 en orden.
-- Las tablas de auth/storage/realtime las provee Supabase.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Baseline: update_timestamp() [FUNCTION]
--

CREATE OR REPLACE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO postgres;

--

-- Baseline: audit_logs [TABLE]
--

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid,
    action character varying(255) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    response_status integer,
    response_data jsonb,
    duration_ms integer
)
PARTITION BY RANGE (created_at);


ALTER TABLE public.audit_logs OWNER TO postgres;

--

-- Baseline: audit_logs_default [TABLE]
--

CREATE TABLE IF NOT EXISTS public.audit_logs_default (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid,
    action character varying(255) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    response_status integer,
    response_data jsonb,
    duration_ms integer
);


ALTER TABLE public.audit_logs_default OWNER TO postgres;

--

-- Baseline: audit_logs_y2026h2 [TABLE]
--

CREATE TABLE IF NOT EXISTS public.audit_logs_y2026h2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid,
    action character varying(255) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    response_status integer,
    response_data jsonb,
    duration_ms integer
);


ALTER TABLE public.audit_logs_y2026h2 OWNER TO postgres;

--

-- Baseline: audit_logs_y2027 [TABLE]
--

CREATE TABLE IF NOT EXISTS public.audit_logs_y2027 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid,
    action character varying(255) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    response_status integer,
    response_data jsonb,
    duration_ms integer
);


ALTER TABLE public.audit_logs_y2027 OWNER TO postgres;

--

-- Baseline: branches [TABLE]
--

CREATE TABLE IF NOT EXISTS public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    address character varying(255),
    city character varying(100),
    state character varying(100),
    country character varying(100),
    postal_code character varying(20),
    phone character varying(30),
    email character varying(255),
    code character varying(20),
    is_main boolean DEFAULT false,
    manager_user_id uuid,
    timezone character varying(50)
);


ALTER TABLE public.branches OWNER TO postgres;

--

-- Baseline: companies [TABLE]
--

CREATE TABLE IF NOT EXISTS public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    tax_id character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    logo_url text,
    phone character varying(30),
    email character varying(255),
    address character varying(255),
    city character varying(100),
    state character varying(100),
    country character varying(100),
    postal_code character varying(20),
    timezone character varying(50),
    slug character varying(100)
);


ALTER TABLE public.companies OWNER TO postgres;

--

-- Baseline: password_history [TABLE]
--

CREATE TABLE IF NOT EXISTS public.password_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_history OWNER TO postgres;

--

-- Baseline: permissions [TABLE]
--

CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    module character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    name character varying(255) DEFAULT 'Sin nombre'::character varying NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--

-- Baseline: refresh_tokens [TABLE]
--

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--

-- Baseline: role_permissions [TABLE]
--

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--

-- Baseline: roles [TABLE]
--

CREATE TABLE IF NOT EXISTS public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    description text,
    color character varying(7)
);


ALTER TABLE public.roles OWNER TO postgres;

--

-- Baseline: token_blacklist [TABLE]
--

CREATE TABLE IF NOT EXISTS public.token_blacklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.token_blacklist OWNER TO postgres;

--

-- Baseline: user_contexts [TABLE]
--

CREATE TABLE IF NOT EXISTS public.user_contexts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    branch_id uuid,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_contexts OWNER TO postgres;

--

-- Baseline: users [TABLE]
--

CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    must_change_password boolean DEFAULT true,
    is_active boolean DEFAULT true,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    name character varying(255),
    email_verified boolean DEFAULT false,
    email_verification_token character varying(255),
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    password_changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    phone character varying(30),
    avatar_url text,
    "position" character varying(100),
    document_type character varying(20),
    document_number character varying(30),
    timezone character varying(50),
    locale character varying(10) DEFAULT 'es'::character varying,
    pending_email character varying(255)
);


ALTER TABLE public.users OWNER TO postgres;

--

-- Baseline: audit_logs_default [TABLE ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.audit_logs') AND inhrelid = to_regclass('public.audit_logs_default')) THEN
    --

ALTER TABLE ONLY public.audit_logs ATTACH PARTITION public.audit_logs_default DEFAULT;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2026h2 [TABLE ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.audit_logs') AND inhrelid = to_regclass('public.audit_logs_y2026h2')) THEN
    --

ALTER TABLE ONLY public.audit_logs ATTACH PARTITION public.audit_logs_y2026h2 FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2027 [TABLE ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.audit_logs') AND inhrelid = to_regclass('public.audit_logs_y2027')) THEN
    --

ALTER TABLE ONLY public.audit_logs ATTACH PARTITION public.audit_logs_y2027 FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2028-01-01 00:00:00+00');


--;
  END IF;
END $$;

-- Baseline: audit_logs audit_logs_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_pkey') THEN
    --

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id, created_at);


--;
  END IF;
END $$;

-- Baseline: audit_logs_default audit_logs_default_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_default_pkey') THEN
    --

ALTER TABLE ONLY public.audit_logs_default
    ADD CONSTRAINT audit_logs_default_pkey PRIMARY KEY (id, created_at);


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2026h2 audit_logs_y2026h2_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_y2026h2_pkey') THEN
    --

ALTER TABLE ONLY public.audit_logs_y2026h2
    ADD CONSTRAINT audit_logs_y2026h2_pkey PRIMARY KEY (id, created_at);


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2027 audit_logs_y2027_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_y2027_pkey') THEN
    --

ALTER TABLE ONLY public.audit_logs_y2027
    ADD CONSTRAINT audit_logs_y2027_pkey PRIMARY KEY (id, created_at);


--;
  END IF;
END $$;

-- Baseline: branches branches_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branches_pkey') THEN
    --

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--;
  END IF;
END $$;

-- Baseline: companies companies_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_pkey') THEN
    --

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--;
  END IF;
END $$;

-- Baseline: companies companies_slug_key [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_slug_key') THEN
    --

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_slug_key UNIQUE (slug);


--;
  END IF;
END $$;

-- Baseline: password_history password_history_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_history_pkey') THEN
    --

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_pkey PRIMARY KEY (id);


--;
  END IF;
END $$;

-- Baseline: permissions permissions_code_key [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permissions_code_key') THEN
    --

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--;
  END IF;
END $$;

-- Baseline: permissions permissions_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permissions_pkey') THEN
    --

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--;
  END IF;
END $$;

-- Baseline: refresh_tokens refresh_tokens_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_pkey') THEN
    --

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--;
  END IF;
END $$;

-- Baseline: role_permissions role_permissions_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_pkey') THEN
    --

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--;
  END IF;
END $$;

-- Baseline: roles roles_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_pkey') THEN
    --

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--;
  END IF;
END $$;

-- Baseline: token_blacklist token_blacklist_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'token_blacklist_pkey') THEN
    --

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_pkey PRIMARY KEY (id);


--;
  END IF;
END $$;

-- Baseline: token_blacklist token_blacklist_token_hash_key [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'token_blacklist_token_hash_key') THEN
    --

ALTER TABLE ONLY public.token_blacklist
    ADD CONSTRAINT token_blacklist_token_hash_key UNIQUE (token_hash);


--;
  END IF;
END $$;

-- Baseline: user_contexts user_contexts_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_contexts_pkey') THEN
    --

ALTER TABLE ONLY public.user_contexts
    ADD CONSTRAINT user_contexts_pkey PRIMARY KEY (id);


--;
  END IF;
END $$;

-- Baseline: users users_pkey [CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey') THEN
    --

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--;
  END IF;
END $$;

-- Baseline: idx_audit_logs_company_created [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON ONLY public.audit_logs USING btree (company_id, created_at DESC);


--

-- Baseline: audit_logs_default_company_id_created_at_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_default_company_id_created_at_idx ON public.audit_logs_default USING btree (company_id, created_at DESC);


--

-- Baseline: idx_audit_company_entity [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_audit_company_entity ON ONLY public.audit_logs USING btree (company_id, entity_type, entity_id);


--

-- Baseline: audit_logs_default_company_id_entity_type_entity_id_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_default_company_id_entity_type_entity_id_idx ON public.audit_logs_default USING btree (company_id, entity_type, entity_id);


--

-- Baseline: idx_audit_logs_company_id [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON ONLY public.audit_logs USING btree (company_id);


--

-- Baseline: audit_logs_default_company_id_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_default_company_id_idx ON public.audit_logs_default USING btree (company_id);


--

-- Baseline: idx_audit_created_at [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON ONLY public.audit_logs USING btree (created_at);


--

-- Baseline: audit_logs_default_created_at_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_default_created_at_idx ON public.audit_logs_default USING btree (created_at);


--

-- Baseline: idx_audit_logs_created_at [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON ONLY public.audit_logs USING btree (created_at DESC);


--

-- Baseline: audit_logs_default_created_at_idx1 [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_default_created_at_idx1 ON public.audit_logs_default USING btree (created_at DESC);


--

-- Baseline: idx_audit_logs_entity_type [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON ONLY public.audit_logs USING btree (entity_type);


--

-- Baseline: audit_logs_default_entity_type_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_default_entity_type_idx ON public.audit_logs_default USING btree (entity_type);


--

-- Baseline: idx_audit_logs_user_id [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON ONLY public.audit_logs USING btree (user_id);


--

-- Baseline: audit_logs_default_user_id_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_default_user_id_idx ON public.audit_logs_default USING btree (user_id);


--

-- Baseline: audit_logs_y2026h2_company_id_created_at_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2026h2_company_id_created_at_idx ON public.audit_logs_y2026h2 USING btree (company_id, created_at DESC);


--

-- Baseline: audit_logs_y2026h2_company_id_entity_type_entity_id_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2026h2_company_id_entity_type_entity_id_idx ON public.audit_logs_y2026h2 USING btree (company_id, entity_type, entity_id);


--

-- Baseline: audit_logs_y2026h2_company_id_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2026h2_company_id_idx ON public.audit_logs_y2026h2 USING btree (company_id);


--

-- Baseline: audit_logs_y2026h2_created_at_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2026h2_created_at_idx ON public.audit_logs_y2026h2 USING btree (created_at);


--

-- Baseline: audit_logs_y2026h2_created_at_idx1 [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2026h2_created_at_idx1 ON public.audit_logs_y2026h2 USING btree (created_at DESC);


--

-- Baseline: audit_logs_y2026h2_entity_type_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2026h2_entity_type_idx ON public.audit_logs_y2026h2 USING btree (entity_type);


--

-- Baseline: audit_logs_y2026h2_user_id_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2026h2_user_id_idx ON public.audit_logs_y2026h2 USING btree (user_id);


--

-- Baseline: audit_logs_y2027_company_id_created_at_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2027_company_id_created_at_idx ON public.audit_logs_y2027 USING btree (company_id, created_at DESC);


--

-- Baseline: audit_logs_y2027_company_id_entity_type_entity_id_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2027_company_id_entity_type_entity_id_idx ON public.audit_logs_y2027 USING btree (company_id, entity_type, entity_id);


--

-- Baseline: audit_logs_y2027_company_id_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2027_company_id_idx ON public.audit_logs_y2027 USING btree (company_id);


--

-- Baseline: audit_logs_y2027_created_at_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2027_created_at_idx ON public.audit_logs_y2027 USING btree (created_at);


--

-- Baseline: audit_logs_y2027_created_at_idx1 [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2027_created_at_idx1 ON public.audit_logs_y2027 USING btree (created_at DESC);


--

-- Baseline: audit_logs_y2027_entity_type_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2027_entity_type_idx ON public.audit_logs_y2027 USING btree (entity_type);


--

-- Baseline: audit_logs_y2027_user_id_idx [INDEX]
--

CREATE INDEX IF NOT EXISTS audit_logs_y2027_user_id_idx ON public.audit_logs_y2027 USING btree (user_id);


--

-- Baseline: idx_branches_company_id [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_branches_company_id ON public.branches USING btree (company_id);


--

-- Baseline: idx_password_history_user_id [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history USING btree (user_id);


--

-- Baseline: idx_refresh_tokens_token_hash [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON public.refresh_tokens USING btree (token_hash);


--

-- Baseline: idx_refresh_tokens_user_id [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--

-- Baseline: idx_roles_company_id [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_roles_company_id ON public.roles USING btree (company_id);


--

-- Baseline: idx_token_blacklist_hash [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON public.token_blacklist USING btree (token_hash);


--

-- Baseline: idx_unique_user_context [INDEX]
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_context ON public.user_contexts USING btree (user_id, company_id, branch_id) WHERE (branch_id IS NOT NULL);


--

-- Baseline: idx_user_contexts_lookup [INDEX]
--

CREATE INDEX IF NOT EXISTS idx_user_contexts_lookup ON public.user_contexts USING btree (user_id, company_id);


--

-- Baseline: idx_users_email [INDEX]
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--

-- Baseline: uq_branches_main_per_company [INDEX]
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_main_per_company ON public.branches USING btree (company_id) WHERE ((is_main = true) AND (deleted_at IS NULL));


--

-- Baseline: audit_logs_default_company_id_created_at_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_company_created') AND inhrelid = to_regclass('public.audit_logs_default_company_id_created_at_idx;')) THEN
    --

ALTER INDEX public.idx_audit_logs_company_created ATTACH PARTITION public.audit_logs_default_company_id_created_at_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_default_company_id_entity_type_entity_id_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_company_entity') AND inhrelid = to_regclass('public.audit_logs_default_company_id_entity_type_entity_id_idx;')) THEN
    --

ALTER INDEX public.idx_audit_company_entity ATTACH PARTITION public.audit_logs_default_company_id_entity_type_entity_id_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_default_company_id_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_company_id') AND inhrelid = to_regclass('public.audit_logs_default_company_id_idx;')) THEN
    --

ALTER INDEX public.idx_audit_logs_company_id ATTACH PARTITION public.audit_logs_default_company_id_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_default_created_at_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_created_at') AND inhrelid = to_regclass('public.audit_logs_default_created_at_idx;')) THEN
    --

ALTER INDEX public.idx_audit_created_at ATTACH PARTITION public.audit_logs_default_created_at_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_default_created_at_idx1 [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_created_at') AND inhrelid = to_regclass('public.audit_logs_default_created_at_idx1;')) THEN
    --

ALTER INDEX public.idx_audit_logs_created_at ATTACH PARTITION public.audit_logs_default_created_at_idx1;


--;
  END IF;
END $$;

-- Baseline: audit_logs_default_entity_type_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_entity_type') AND inhrelid = to_regclass('public.audit_logs_default_entity_type_idx;')) THEN
    --

ALTER INDEX public.idx_audit_logs_entity_type ATTACH PARTITION public.audit_logs_default_entity_type_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_default_pkey [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.audit_logs_pkey') AND inhrelid = to_regclass('public.audit_logs_default_pkey;')) THEN
    --

ALTER INDEX public.audit_logs_pkey ATTACH PARTITION public.audit_logs_default_pkey;


--;
  END IF;
END $$;

-- Baseline: audit_logs_default_user_id_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_user_id') AND inhrelid = to_regclass('public.audit_logs_default_user_id_idx;')) THEN
    --

ALTER INDEX public.idx_audit_logs_user_id ATTACH PARTITION public.audit_logs_default_user_id_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2026h2_company_id_created_at_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_company_created') AND inhrelid = to_regclass('public.audit_logs_y2026h2_company_id_created_at_idx;')) THEN
    --

ALTER INDEX public.idx_audit_logs_company_created ATTACH PARTITION public.audit_logs_y2026h2_company_id_created_at_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2026h2_company_id_entity_type_entity_id_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_company_entity') AND inhrelid = to_regclass('public.audit_logs_y2026h2_company_id_entity_type_entity_id_idx;')) THEN
    --

ALTER INDEX public.idx_audit_company_entity ATTACH PARTITION public.audit_logs_y2026h2_company_id_entity_type_entity_id_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2026h2_company_id_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_company_id') AND inhrelid = to_regclass('public.audit_logs_y2026h2_company_id_idx;')) THEN
    --

ALTER INDEX public.idx_audit_logs_company_id ATTACH PARTITION public.audit_logs_y2026h2_company_id_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2026h2_created_at_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_created_at') AND inhrelid = to_regclass('public.audit_logs_y2026h2_created_at_idx;')) THEN
    --

ALTER INDEX public.idx_audit_created_at ATTACH PARTITION public.audit_logs_y2026h2_created_at_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2026h2_created_at_idx1 [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_created_at') AND inhrelid = to_regclass('public.audit_logs_y2026h2_created_at_idx1;')) THEN
    --

ALTER INDEX public.idx_audit_logs_created_at ATTACH PARTITION public.audit_logs_y2026h2_created_at_idx1;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2026h2_entity_type_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_entity_type') AND inhrelid = to_regclass('public.audit_logs_y2026h2_entity_type_idx;')) THEN
    --

ALTER INDEX public.idx_audit_logs_entity_type ATTACH PARTITION public.audit_logs_y2026h2_entity_type_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2026h2_pkey [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.audit_logs_pkey') AND inhrelid = to_regclass('public.audit_logs_y2026h2_pkey;')) THEN
    --

ALTER INDEX public.audit_logs_pkey ATTACH PARTITION public.audit_logs_y2026h2_pkey;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2026h2_user_id_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_user_id') AND inhrelid = to_regclass('public.audit_logs_y2026h2_user_id_idx;')) THEN
    --

ALTER INDEX public.idx_audit_logs_user_id ATTACH PARTITION public.audit_logs_y2026h2_user_id_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2027_company_id_created_at_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_company_created') AND inhrelid = to_regclass('public.audit_logs_y2027_company_id_created_at_idx;')) THEN
    --

ALTER INDEX public.idx_audit_logs_company_created ATTACH PARTITION public.audit_logs_y2027_company_id_created_at_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2027_company_id_entity_type_entity_id_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_company_entity') AND inhrelid = to_regclass('public.audit_logs_y2027_company_id_entity_type_entity_id_idx;')) THEN
    --

ALTER INDEX public.idx_audit_company_entity ATTACH PARTITION public.audit_logs_y2027_company_id_entity_type_entity_id_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2027_company_id_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_company_id') AND inhrelid = to_regclass('public.audit_logs_y2027_company_id_idx;')) THEN
    --

ALTER INDEX public.idx_audit_logs_company_id ATTACH PARTITION public.audit_logs_y2027_company_id_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2027_created_at_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_created_at') AND inhrelid = to_regclass('public.audit_logs_y2027_created_at_idx;')) THEN
    --

ALTER INDEX public.idx_audit_created_at ATTACH PARTITION public.audit_logs_y2027_created_at_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2027_created_at_idx1 [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_created_at') AND inhrelid = to_regclass('public.audit_logs_y2027_created_at_idx1;')) THEN
    --

ALTER INDEX public.idx_audit_logs_created_at ATTACH PARTITION public.audit_logs_y2027_created_at_idx1;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2027_entity_type_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_entity_type') AND inhrelid = to_regclass('public.audit_logs_y2027_entity_type_idx;')) THEN
    --

ALTER INDEX public.idx_audit_logs_entity_type ATTACH PARTITION public.audit_logs_y2027_entity_type_idx;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2027_pkey [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.audit_logs_pkey') AND inhrelid = to_regclass('public.audit_logs_y2027_pkey;')) THEN
    --

ALTER INDEX public.audit_logs_pkey ATTACH PARTITION public.audit_logs_y2027_pkey;


--;
  END IF;
END $$;

-- Baseline: audit_logs_y2027_user_id_idx [INDEX ATTACH]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent = to_regclass('public.idx_audit_logs_user_id') AND inhrelid = to_regclass('public.audit_logs_y2027_user_id_idx;')) THEN
    --

ALTER INDEX public.idx_audit_logs_user_id ATTACH PARTITION public.audit_logs_y2027_user_id_idx;


--;
  END IF;
END $$;

-- Baseline: branches trg_branches_updated_at [TRIGGER]
DROP TRIGGER IF EXISTS trg_branches_updated_at ON public.branches;
--

CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--

-- Baseline: companies trg_companies_updated_at [TRIGGER]
DROP TRIGGER IF EXISTS trg_companies_updated_at ON public.companies;
--

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--

-- Baseline: roles trg_roles_updated_at [TRIGGER]
DROP TRIGGER IF EXISTS trg_roles_updated_at ON public.roles;
--

CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--

-- Baseline: user_contexts trg_user_contexts_updated_at [TRIGGER]
DROP TRIGGER IF EXISTS trg_user_contexts_updated_at ON public.user_contexts;
--

CREATE TRIGGER trg_user_contexts_updated_at BEFORE UPDATE ON public.user_contexts FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--

-- Baseline: users trg_users_updated_at [TRIGGER]
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--

-- Baseline: audit_logs fk_audit_company [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_company') THEN
    --

ALTER TABLE public.audit_logs
    ADD CONSTRAINT fk_audit_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--;
  END IF;
END $$;

-- Baseline: audit_logs fk_audit_user [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_user') THEN
    --

ALTER TABLE public.audit_logs
    ADD CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--;
  END IF;
END $$;

-- Baseline: branches fk_branches_company [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_branches_company') THEN
    --

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT fk_branches_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--;
  END IF;
END $$;

-- Baseline: branches fk_branches_manager [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_branches_manager') THEN
    --

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT fk_branches_manager FOREIGN KEY (manager_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--;
  END IF;
END $$;

-- Baseline: user_contexts fk_context_branch [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_context_branch') THEN
    --

ALTER TABLE ONLY public.user_contexts
    ADD CONSTRAINT fk_context_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--;
  END IF;
END $$;

-- Baseline: user_contexts fk_context_company [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_context_company') THEN
    --

ALTER TABLE ONLY public.user_contexts
    ADD CONSTRAINT fk_context_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--;
  END IF;
END $$;

-- Baseline: user_contexts fk_context_role [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_context_role') THEN
    --

ALTER TABLE ONLY public.user_contexts
    ADD CONSTRAINT fk_context_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--;
  END IF;
END $$;

-- Baseline: user_contexts fk_context_user [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_context_user') THEN
    --

ALTER TABLE ONLY public.user_contexts
    ADD CONSTRAINT fk_context_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--;
  END IF;
END $$;

-- Baseline: roles fk_roles_company [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_roles_company') THEN
    --

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT fk_roles_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--;
  END IF;
END $$;

-- Baseline: role_permissions fk_rp_permission [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rp_permission') THEN
    --

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--;
  END IF;
END $$;

-- Baseline: role_permissions fk_rp_role [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rp_role') THEN
    --

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--;
  END IF;
END $$;

-- Baseline: password_history password_history_user_id_fkey [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_history_user_id_fkey') THEN
    --

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--;
  END IF;
END $$;

-- Baseline: refresh_tokens refresh_tokens_user_id_fkey [FK CONSTRAINT]
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_user_id_fkey') THEN
    --

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--;
  END IF;
END $$;

-- Baseline: audit_logs [ROW SECURITY]
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 394

-- Baseline: audit_logs_default [ROW SECURITY]
--

ALTER TABLE public.audit_logs_default ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 392

-- Baseline: audit_logs_y2026h2 [ROW SECURITY]
--

ALTER TABLE public.audit_logs_y2026h2 ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 393

-- Baseline: audit_logs_y2027 [ROW SECURITY]
--

ALTER TABLE public.audit_logs_y2027 ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 387

-- Baseline: branches [ROW SECURITY]
--

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 385

-- Baseline: companies [ROW SECURITY]
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 397

-- Baseline: password_history [ROW SECURITY]
--

ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 386

-- Baseline: permissions [ROW SECURITY]
--

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 395

-- Baseline: refresh_tokens [ROW SECURITY]
--

ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 389

-- Baseline: role_permissions [ROW SECURITY]
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 388

-- Baseline: roles [ROW SECURITY]
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 396

-- Baseline: token_blacklist [ROW SECURITY]
--

ALTER TABLE public.token_blacklist ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 390

-- Baseline: user_contexts [ROW SECURITY]
--

ALTER TABLE public.user_contexts ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 384

-- Baseline: users [ROW SECURITY]
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Dependencies: 372

-- Baseline: TABLE audit_logs [ACL]
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Dependencies: 394

-- Baseline: TABLE audit_logs_default [ACL]
--

GRANT ALL ON TABLE public.audit_logs_default TO anon;
GRANT ALL ON TABLE public.audit_logs_default TO authenticated;
GRANT ALL ON TABLE public.audit_logs_default TO service_role;


--
-- Dependencies: 392

-- Baseline: TABLE audit_logs_y2026h2 [ACL]
--

GRANT ALL ON TABLE public.audit_logs_y2026h2 TO anon;
GRANT ALL ON TABLE public.audit_logs_y2026h2 TO authenticated;
GRANT ALL ON TABLE public.audit_logs_y2026h2 TO service_role;


--
-- Dependencies: 393

-- Baseline: TABLE audit_logs_y2027 [ACL]
--

GRANT ALL ON TABLE public.audit_logs_y2027 TO anon;
GRANT ALL ON TABLE public.audit_logs_y2027 TO authenticated;
GRANT ALL ON TABLE public.audit_logs_y2027 TO service_role;


--
-- Dependencies: 387

-- Baseline: TABLE branches [ACL]
--

GRANT ALL ON TABLE public.branches TO anon;
GRANT ALL ON TABLE public.branches TO authenticated;
GRANT ALL ON TABLE public.branches TO service_role;


--
-- Dependencies: 385

-- Baseline: TABLE companies [ACL]
--

GRANT ALL ON TABLE public.companies TO anon;
GRANT ALL ON TABLE public.companies TO authenticated;
GRANT ALL ON TABLE public.companies TO service_role;


--
-- Dependencies: 397

-- Baseline: TABLE password_history [ACL]
--

GRANT ALL ON TABLE public.password_history TO anon;
GRANT ALL ON TABLE public.password_history TO authenticated;
GRANT ALL ON TABLE public.password_history TO service_role;


--
-- Dependencies: 386

-- Baseline: TABLE permissions [ACL]
--

GRANT ALL ON TABLE public.permissions TO anon;
GRANT ALL ON TABLE public.permissions TO authenticated;
GRANT ALL ON TABLE public.permissions TO service_role;


--
-- Dependencies: 395

-- Baseline: TABLE refresh_tokens [ACL]
--

GRANT ALL ON TABLE public.refresh_tokens TO anon;
GRANT ALL ON TABLE public.refresh_tokens TO authenticated;
GRANT ALL ON TABLE public.refresh_tokens TO service_role;


--
-- Dependencies: 389

-- Baseline: TABLE role_permissions [ACL]
--

GRANT ALL ON TABLE public.role_permissions TO anon;
GRANT ALL ON TABLE public.role_permissions TO authenticated;
GRANT ALL ON TABLE public.role_permissions TO service_role;


--
-- Dependencies: 388

-- Baseline: TABLE roles [ACL]
--

GRANT ALL ON TABLE public.roles TO anon;
GRANT ALL ON TABLE public.roles TO authenticated;
GRANT ALL ON TABLE public.roles TO service_role;


--
-- Dependencies: 396

-- Baseline: TABLE token_blacklist [ACL]
--

GRANT ALL ON TABLE public.token_blacklist TO anon;
GRANT ALL ON TABLE public.token_blacklist TO authenticated;
GRANT ALL ON TABLE public.token_blacklist TO service_role;


--
-- Dependencies: 390

-- Baseline: TABLE user_contexts [ACL]
--

GRANT ALL ON TABLE public.user_contexts TO anon;
GRANT ALL ON TABLE public.user_contexts TO authenticated;
GRANT ALL ON TABLE public.user_contexts TO service_role;


--
-- Dependencies: 384

-- Baseline: TABLE users [ACL]
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Dependencies: 372

