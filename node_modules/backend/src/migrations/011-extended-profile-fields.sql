-- ============================================================
-- Migracion 011: Campos complementarios de perfil, empresa,
-- sedes y roles (datos de contacto, identidad y organización).
-- Solo agrega columnas NULLables: no rompe datos existentes.
-- Ejecutar en Supabase despues de la 010.
-- ============================================================

-- ---------- users: contacto, identidad y preferencias ----------
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_type VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_number VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'es';
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255);

-- ---------- companies: contacto, dirección fiscal e identidad ----------
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- ---------- branches: código, principal, responsable y zona ----------
ALTER TABLE branches ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_user_id UUID;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_branches_manager'
  ) THEN
    ALTER TABLE branches
      ADD CONSTRAINT fk_branches_manager
      FOREIGN KEY (manager_user_id) REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Una sola sede principal por empresa (ignora borradas lógicamente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_branches_main_per_company'
  ) THEN
    CREATE UNIQUE INDEX uq_branches_main_per_company
      ON branches (company_id)
      WHERE is_main = TRUE AND deleted_at IS NULL;
  END IF;
END $$;

-- ---------- roles: descripción y color ----------
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS color VARCHAR(7);
