-- Sprint I: Phase 1 spec compliance pass
-- 1) widgets.interactions_total — spec calls for a running total of click/hover events
ALTER TABLE public.widgets
  ADD COLUMN IF NOT EXISTS interactions_total integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_widget_interaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.event_type IN ('click','hover','interaction') THEN
    UPDATE public.widgets
       SET interactions_total = COALESCE(interactions_total, 0) + 1
     WHERE id = NEW.widget_id;
  END IF;
  IF NEW.event_type = 'impression' THEN
    UPDATE public.widgets
       SET impressions_total = COALESCE(impressions_total, 0) + 1
     WHERE id = NEW.widget_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_widget_event_counters ON public.widget_events;
CREATE TRIGGER trg_widget_event_counters
AFTER INSERT ON public.widget_events
FOR EACH ROW EXECUTE FUNCTION public.increment_widget_interaction();

-- 2) get_widget_analytics RPC — returns daily buckets aggregated server-side.
-- Avoids hitting the 1000-row default cap and scales to millions of events.
CREATE OR REPLACE FUNCTION public.get_widget_analytics(
  _business_id uuid,
  _start timestamptz,
  _end timestamptz
)
RETURNS TABLE (
  bucket date,
  impressions integer,
  interactions integer,
  conversions integer,
  assists integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH days AS (
    SELECT generate_series(_start::date, _end::date, interval '1 day')::date AS bucket
  ),
  agg AS (
    SELECT
      fired_at::date AS bucket,
      count(*) FILTER (WHERE event_type = 'impression')::int AS impressions,
      count(*) FILTER (WHERE event_type IN ('click','hover','interaction'))::int AS interactions,
      count(*) FILTER (WHERE event_type = 'conversion')::int AS conversions,
      count(*) FILTER (WHERE event_type = 'conversion_assist')::int AS assists
    FROM public.widget_events
    WHERE business_id = _business_id
      AND fired_at >= _start
      AND fired_at <= _end
      AND (public.is_business_member(_business_id) OR public.is_platform_admin())
    GROUP BY fired_at::date
  )
  SELECT
    d.bucket,
    COALESCE(a.impressions, 0),
    COALESCE(a.interactions, 0),
    COALESCE(a.conversions, 0),
    COALESCE(a.assists, 0)
  FROM days d
  LEFT JOIN agg a ON a.bucket = d.bucket
  ORDER BY d.bucket ASC;
$$;

-- 3) get_top_proof_performance RPC — top proofs by event counts in date range.
CREATE OR REPLACE FUNCTION public.get_top_proof_performance(
  _business_id uuid,
  _start timestamptz,
  _end timestamptz,
  _limit integer DEFAULT 10
)
RETURNS TABLE (
  proof_id uuid,
  author_name text,
  proof_type text,
  impressions integer,
  interactions integer,
  conversions integer,
  assists integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH agg AS (
    SELECT
      proof_object_id AS proof_id,
      count(*) FILTER (WHERE event_type = 'impression')::int AS impressions,
      count(*) FILTER (WHERE event_type IN ('click','hover','interaction'))::int AS interactions,
      count(*) FILTER (WHERE event_type = 'conversion')::int AS conversions,
      count(*) FILTER (WHERE event_type = 'conversion_assist')::int AS assists
    FROM public.widget_events
    WHERE business_id = _business_id
      AND proof_object_id IS NOT NULL
      AND fired_at >= _start
      AND fired_at <= _end
      AND (public.is_business_member(_business_id) OR public.is_platform_admin())
    GROUP BY proof_object_id
  )
  SELECT
    a.proof_id,
    p.author_name,
    p.type::text,
    a.impressions,
    a.interactions,
    a.conversions,
    a.assists
  FROM agg a
  JOIN public.proof_objects p ON p.id = a.proof_id
  WHERE p.business_id = _business_id
  ORDER BY a.impressions DESC
  LIMIT GREATEST(1, COALESCE(_limit, 10));
$$;