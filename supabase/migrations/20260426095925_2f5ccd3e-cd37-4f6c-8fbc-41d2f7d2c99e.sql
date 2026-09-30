ALTER TABLE public.integration_events
  ADD COLUMN IF NOT EXISTS external_event_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS error_message text;

UPDATE public.integration_events
SET status = CASE WHEN processed_at IS NOT NULL THEN 'processed' ELSE 'received' END
WHERE status = 'received';

CREATE UNIQUE INDEX IF NOT EXISTS integration_events_external_event_uniq
  ON public.integration_events (integration_id, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS integration_events_status_idx
  ON public.integration_events (status, received_at DESC);