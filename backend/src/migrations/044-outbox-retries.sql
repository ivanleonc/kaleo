-- 044: Reintentos con backoff y dead-letter para outbox.
--
-- Antes el publicador reintentaba cada 5s hasta 10 intentos sin espera
-- creciente. Ahora los eventos fallidos se reprograman y, al agotar intentos,
-- quedan en dead-letter para inspección.

ALTER TABLE public.outbox_events
    ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.outbox_events
    ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_outbox_events_pending
    ON public.outbox_events (next_attempt_at)
    WHERE published_at IS NULL AND dead_lettered_at IS NULL;
