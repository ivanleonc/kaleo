-- 030: Versión de acceso por membership.
--
-- Permite invalidar los claims de una empresa sin afectar las sesiones que el
-- usuario tenga en otras empresas. El access token lleva `companyVersions`;
-- CompanyAccessGuard compara ese valor contra `memberships.token_version`.
--
-- Se incrementa al cambiar roles, reactivar una membership o cambiar los
-- permisos de un rol.

ALTER TABLE public.memberships
    ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;
