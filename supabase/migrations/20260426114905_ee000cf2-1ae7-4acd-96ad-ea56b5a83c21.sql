-- Sprint J: add G2 as a first-class integration provider.
ALTER TYPE public.integration_provider ADD VALUE IF NOT EXISTS 'g2';

-- Idempotency: stop a replayed webhook from being recorded twice.
-- Partial index — many events have no external_event_id and we don't want them in the unique constraint.
CREATE UNIQUE INDEX IF NOT EXISTS integration_events_external_event_id_uniq
  ON public.integration_events (integration_id, external_event_id)
  WHERE external_event_id IS NOT NULL;

-- Recent-events lookups (integration detail page + admin health view).
CREATE INDEX IF NOT EXISTS integration_events_business_received_at_idx
  ON public.integration_events (business_id, received_at DESC);