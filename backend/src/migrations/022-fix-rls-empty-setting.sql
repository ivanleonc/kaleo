-- 022: Corrige la política RLS piloto para el caso sin contexto.
--
-- `current_setting('app.company_id', true)` devuelve NULL si nunca se definió,
-- pero devuelve '' después de un RESET. `''::uuid` lanza error. NULLIF lo
-- convierte en NULL y la comparación falla cerrada (0 filas), que es lo que
-- queremos cuando no hay TenantContext.

DROP POLICY IF EXISTS branches_tenant_isolation ON public.branches;
CREATE POLICY branches_tenant_isolation ON public.branches
  USING (
    company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
  )
  WITH CHECK (
    company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
  );
