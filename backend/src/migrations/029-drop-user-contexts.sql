-- 029: Eliminar el modelo plano `user_contexts`.
--
-- Requisito: desplegar primero la versión de la aplicación que solo lee y
-- escribe memberships. El `user_contexts` de esta migración es destructivo.
--
-- Orden recomendado:
--   1. Desplegar backend (upsertMembershipWithRoles).
--   2. Verificar login, onboarding, invitaciones y miembros en producción.
--   3. Aplicar esta migración.

DROP TRIGGER IF EXISTS trg_user_contexts_sync_memberships ON public.user_contexts;
DROP FUNCTION IF EXISTS public.sync_membership_from_context();
DROP TABLE IF EXISTS public.user_contexts CASCADE;
