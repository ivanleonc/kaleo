-- 033: Familias de refresh tokens.
--
-- Cada login crea una familia; cada refresh rota el token dentro de la misma
-- familia. Si se presenta un token ya revocado (reuso), se revoca la familia
-- completa. Los tokens existentes reciben una familia propia para no invalidar
-- sesiones activas durante el despliegue.

ALTER TABLE public.refresh_tokens
    ADD COLUMN IF NOT EXISTS family_id uuid;

UPDATE public.refresh_tokens
SET family_id = gen_random_uuid()
WHERE family_id IS NULL;

ALTER TABLE public.refresh_tokens
    ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE public.refresh_tokens
    ADD COLUMN IF NOT EXISTS rotated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family
    ON public.refresh_tokens (family_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_tokens_hash
    ON public.refresh_tokens (token_hash);
