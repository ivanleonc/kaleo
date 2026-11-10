-- 032: Email de usuario único sin distinguir mayúsculas.
--
-- Evita cuentas duplicadas del tipo Ana@x.com / ana@x.com. La aplicación
-- normaliza a minúsculas al crear o cambiar el email; el índice protege
-- contra carreras y datos externos.

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower
    ON public.users (lower(email))
    WHERE deleted_at IS NULL;
