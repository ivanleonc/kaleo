-- 035: Metadata de sesión en refresh tokens.
--
-- Permite auditar desde dónde se emitió y usó cada refresh token. No cambia
-- la autenticación; es evidencia para detección de abuso y futuras pantallas
-- de sesiones activas.

ALTER TABLE public.refresh_tokens
    ADD COLUMN IF NOT EXISTS ip_address text;

ALTER TABLE public.refresh_tokens
    ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE public.refresh_tokens
    ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

UPDATE public.refresh_tokens
SET last_used_at = COALESCE(last_used_at, created_at)
WHERE last_used_at IS NULL;
