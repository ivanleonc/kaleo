-- 015: Añade expiración a los tokens de verificación de email.
-- Los enlaces de verificación pendientes (pending_email) ahora vencen
-- a las 24 horas. Sin esta columna el enlace era válido para siempre.
-- Re-ejecutable sin error (IF NOT EXISTS).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;

-- Los tokens existentes (antes del deploy) quedan con NULL y se tratan
-- como sin expiración para no romper flujos en vuelo.
-- Todos los tokens nuevos que emita RequestEmailChange tendrán expiración.
