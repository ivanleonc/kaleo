-- 058: workspace del proyecto.
--
-- Campos de presentación para la galería y el dashboard. La portada puede ser
-- una URL externa por ahora; cuando se suba a documentos se migrará a un
-- document_id con descarga autorizada.

ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS category text,
    ADD COLUMN IF NOT EXISTS cover_url text;

CREATE INDEX IF NOT EXISTS idx_projects_company_category
    ON public.projects (company_id, category)
    WHERE deleted_at IS NULL;
