-- Sprint J: Admin ops metrics RPC + integration health RPC
-- All functions are SECURITY DEFINER and gated by is_platform_admin().

-- Aggregated overview stats for ADM-01.
CREATE OR REPLACE FUNCTION public.admin_overview_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  WITH
    biz AS (
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE suspended_at IS NULL) AS active,
        count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS new_30d,
        count(*) FILTER (WHERE plan_tier <> 'free' AND suspended_at IS NULL) AS paying
      FROM public.businesses
    ),
    proof AS (
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS last_24h,
        count(*) FILTER (WHERE status = 'pending_review') AS moderation_queue
      FROM public.proof_objects
    ),
    backlog AS (
      SELECT count(*) AS unprocessed FROM public.integration_events WHERE processed_at IS NULL
    ),
    failed_int AS (
      SELECT count(*) AS errored FROM public.integrations WHERE status = 'error'
    ),
    -- Approximate MRR from monthly limits as a proxy when stripe data isn't available.
    mrr AS (
      SELECT
        COALESCE(SUM(CASE plan_tier
          WHEN 'starter' THEN 29
          WHEN 'growth' THEN 79
          WHEN 'scale' THEN 199
          ELSE 0
        END), 0)::int AS amount
      FROM public.businesses
      WHERE suspended_at IS NULL AND plan_tier <> 'free'
    )
  SELECT jsonb_build_object(
    'businesses_total', biz.total,
    'businesses_active', biz.active,
    'businesses_new_30d', biz.new_30d,
    'paying_businesses', biz.paying,
    'proof_total', proof.total,
    'proof_last_24h', proof.last_24h,
    'moderation_queue', proof.moderation_queue,
    'integration_backlog', backlog.unprocessed,
    'integration_errors', failed_int.errored,
    'mrr_usd', mrr.amount
  ) INTO result
  FROM biz, proof, backlog, failed_int, mrr;

  RETURN result;
END;
$$;

-- Daily series for the last N days (new businesses + new proofs).
CREATE OR REPLACE FUNCTION public.admin_daily_series(_days int DEFAULT 30)
RETURNS TABLE(day date, new_businesses int, new_proofs int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(
      (now() - (greatest(_days, 1) - 1) * interval '1 day')::date,
      now()::date,
      interval '1 day'
    )::date AS day
  ),
  biz AS (
    SELECT created_at::date AS day, count(*)::int AS n
    FROM public.businesses
    WHERE created_at >= (now() - greatest(_days, 1) * interval '1 day')
    GROUP BY 1
  ),
  pr AS (
    SELECT created_at::date AS day, count(*)::int AS n
    FROM public.proof_objects
    WHERE created_at >= (now() - greatest(_days, 1) * interval '1 day')
    GROUP BY 1
  )
  SELECT
    d.day,
    COALESCE(biz.n, 0) AS new_businesses,
    COALESCE(pr.n, 0) AS new_proofs
  FROM days d
  LEFT JOIN biz ON biz.day = d.day
  LEFT JOIN pr  ON pr.day = d.day
  WHERE public.is_platform_admin()
  ORDER BY d.day ASC;
$$;

-- Per-integration 24h health: total/processed/failed counts.
CREATE OR REPLACE FUNCTION public.admin_integration_health()
RETURNS TABLE(
  integration_id uuid,
  business_id uuid,
  business_name text,
  provider text,
  status text,
  last_sync_at timestamptz,
  events_24h int,
  processed_24h int,
  unprocessed_24h int,
  success_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ev AS (
    SELECT
      integration_id,
      count(*)::int AS events_24h,
      count(*) FILTER (WHERE processed_at IS NOT NULL)::int AS processed_24h,
      count(*) FILTER (WHERE processed_at IS NULL)::int AS unprocessed_24h
    FROM public.integration_events
    WHERE received_at >= now() - interval '24 hours'
    GROUP BY integration_id
  )
  SELECT
    i.id AS integration_id,
    i.business_id,
    b.name AS business_name,
    i.provider::text AS provider,
    i.status::text AS status,
    i.last_sync_at,
    COALESCE(ev.events_24h, 0) AS events_24h,
    COALESCE(ev.processed_24h, 0) AS processed_24h,
    COALESCE(ev.unprocessed_24h, 0) AS unprocessed_24h,
    CASE WHEN COALESCE(ev.events_24h, 0) = 0
      THEN NULL
      ELSE ROUND((ev.processed_24h::numeric / NULLIF(ev.events_24h, 0)::numeric) * 100, 1)
    END AS success_rate
  FROM public.integrations i
  JOIN public.businesses b ON b.id = i.business_id
  LEFT JOIN ev ON ev.integration_id = i.id
  WHERE public.is_platform_admin()
  ORDER BY COALESCE(ev.unprocessed_24h, 0) DESC, i.created_at DESC;
$$;

-- Replay (mark unprocessed) an integration_event so a re-running webhook
-- worker can pick it up. Admin-only.
CREATE OR REPLACE FUNCTION public.admin_replay_integration_event(_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.integration_events
  SET processed_at = NULL, proof_object_id = NULL
  WHERE id = _event_id;

  RETURN FOUND;
END;
$$;

-- Per-business proof counts for integrations.
CREATE OR REPLACE FUNCTION public.business_integration_stats(_business_id uuid)
RETURNS TABLE(
  integration_id uuid,
  proof_count int,
  events_total int,
  last_event_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id AS integration_id,
    (SELECT count(*)::int
       FROM public.proof_objects po
       WHERE po.business_id = _business_id
         AND po.source = i.provider::text
    ) AS proof_count,
    COALESCE((SELECT count(*)::int FROM public.integration_events ie
              WHERE ie.integration_id = i.id), 0) AS events_total,
    (SELECT max(received_at) FROM public.integration_events ie
     WHERE ie.integration_id = i.id) AS last_event_at
  FROM public.integrations i
  WHERE i.business_id = _business_id
    AND (public.is_business_member(_business_id) OR public.is_platform_admin());
$$;
