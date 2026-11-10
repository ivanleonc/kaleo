-- 027: Sincronización user_contexts -> memberships.
--
-- Mientras la aplicación sigue escribiendo el modelo plano user_contexts,
-- estos triggers mantienen memberships/membership_roles/membership_branches
-- como espejo fiel. La migración de lecturas/escrituras al nuevo modelo será
-- incremental; cuando termine, estos triggers se eliminan.

CREATE OR REPLACE FUNCTION public.sync_membership_from_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_membership_id uuid;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.memberships (company_id, user_id, status, joined_at)
        VALUES (NEW.company_id, NEW.user_id, 'active', COALESCE(NEW.created_at, now()))
        ON CONFLICT (company_id, user_id) DO NOTHING;

        SELECT id INTO v_membership_id
        FROM public.memberships
        WHERE company_id = NEW.company_id AND user_id = NEW.user_id;

        IF NEW.role_id IS NOT NULL THEN
            INSERT INTO public.membership_roles (company_id, membership_id, role_id)
            VALUES (NEW.company_id, v_membership_id, NEW.role_id)
            ON CONFLICT DO NOTHING;
        END IF;

        IF NEW.branch_id IS NOT NULL THEN
            INSERT INTO public.membership_branches (company_id, membership_id, branch_id)
            VALUES (NEW.company_id, v_membership_id, NEW.branch_id)
            ON CONFLICT DO NOTHING;
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        SELECT id INTO v_membership_id
        FROM public.memberships
        WHERE company_id = OLD.company_id AND user_id = OLD.user_id;

        IF v_membership_id IS NOT NULL THEN
            IF OLD.role_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM public.user_contexts
                WHERE company_id = OLD.company_id
                  AND user_id = OLD.user_id
                  AND role_id = OLD.role_id
            ) THEN
                DELETE FROM public.membership_roles
                WHERE company_id = OLD.company_id
                  AND membership_id = v_membership_id
                  AND role_id = OLD.role_id;
            END IF;

            IF OLD.branch_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM public.user_contexts
                WHERE company_id = OLD.company_id
                  AND user_id = OLD.user_id
                  AND branch_id = OLD.branch_id
            ) THEN
                DELETE FROM public.membership_branches
                WHERE company_id = OLD.company_id
                  AND membership_id = v_membership_id
                  AND branch_id = OLD.branch_id;
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM public.membership_roles
                WHERE company_id = OLD.company_id AND membership_id = v_membership_id
            ) THEN
                DELETE FROM public.memberships WHERE id = v_membership_id;
            END IF;
        END IF;

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_contexts_sync_memberships ON public.user_contexts;
CREATE TRIGGER trg_user_contexts_sync_memberships
    AFTER INSERT OR DELETE ON public.user_contexts
    FOR EACH ROW EXECUTE FUNCTION public.sync_membership_from_context();
