-- 017: Flag de super-administrador global.
-- Solo se otorga por SQL directo (UPDATE users SET is_super_admin = TRUE ...).
-- No existe ningún endpoint que escriba esta columna: así es imposible la
-- escalada de privilegios desde la app.
-- Re-ejecutable sin error.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;
