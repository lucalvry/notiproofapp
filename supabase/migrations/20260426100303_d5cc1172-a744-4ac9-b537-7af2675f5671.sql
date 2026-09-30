ALTER TABLE public.widget_events
  ADD COLUMN IF NOT EXISTS variant text,
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS visitor_type text;

CREATE INDEX IF NOT EXISTS widget_events_variant_idx
  ON public.widget_events (widget_id, variant, fired_at DESC);

CREATE INDEX IF NOT EXISTS widget_events_event_type_idx
  ON public.widget_events (business_id, event_type, fired_at DESC);