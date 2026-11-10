-- 036: Default de familia en refresh_tokens.
--
-- La 033 se aplicó con `family_id` obligatorio pero sin default. El backend
-- nuevo siempre lo envía; este default cubre inserciones externas o versiones
-- anteriores durante una ventana de despliegue.

ALTER TABLE public.refresh_tokens
    ALTER COLUMN family_id SET DEFAULT gen_random_uuid();
