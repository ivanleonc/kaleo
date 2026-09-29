-- ============================================================
-- Migracion 014: backfill de slugs para empresas existentes
-- Ejecutar despues de la 013.
-- Re-ejecutable: solo procesa filas con slug NULL.
--
-- Contrato: toda empresa debe tener un slug legible porque ahora es el que
-- aparece en la URL (/companies/<slug>/...). Las empresas creadas antes de
-- este cambio no lo tienen (la columna es nullable y createWithOwner no lo
-- seteaba). El codigo nuevo ya genera el slug al crear; esta migracion cubre
-- el historico.
--
-- La columna se deja NULLable a proposito: el invariante lo garantiza el
-- servicio. Asi se evita romper inserciones administrativas futuras.
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  candidate TEXT;
  suffix INTEGER;
BEGIN
  FOR rec IN
    SELECT id, name
    FROM companies
    WHERE slug IS NULL
    ORDER BY created_at
  LOOP
    -- 1. Minusculas + transliteracion de acentos (sin depender de unaccent).
    base_slug := translate(
      lower(coalesce(rec.name, '')),
      'áàäâãéèëêíìïîóòöôõúùüûñç',
      'aaaaaeeeeiiiiooooouuuunc'
    );

    -- 2. Todo lo que no sea a-z0-9 pasa a guion; se colapsan y recortan guiones.
    base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-{2,}', '-', 'g');
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');

    IF base_slug = '' THEN
      base_slug := 'empresa';
    END IF;

    base_slug := left(base_slug, 100);
    base_slug := regexp_replace(base_slug, '-+$', '', 'g');

    -- 3. Resolver colisiones con sufijo numerico. Se compara contra TODAS las
    --    filas (incluidas soft-deleted) porque el UNIQUE de la tabla no filtra
    --    por deleted_at.
    candidate := base_slug;
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM companies WHERE slug = candidate AND id <> rec.id) LOOP
      suffix := suffix + 1;
      candidate := left(base_slug, 100 - length('-' || suffix::text)) || '-' || suffix;
    END LOOP;

    UPDATE companies SET slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;
