-- Rename 'scale' plan tier to 'agency'
-- 1. Backfill existing businesses
UPDATE public.businesses SET plan = 'agency' WHERE plan = 'scale';
UPDATE public.businesses SET plan_tier = 'agency' WHERE plan_tier = 'scale';

-- 2. Update plan_limits() to accept 'agency' instead of 'scale'
CREATE OR REPLACE FUNCTION public.plan_limits(_plan text)
 RETURNS TABLE(proof_limit integer, event_limit integer, domain_limit integer, storage_mb integer, max_video_seconds integer, remove_branding boolean, active_widget_limit integer, data_retention_days integer, team_seats_included integer)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    CASE _plan
      WHEN 'starter' THEN 1000
      WHEN 'growth'  THEN 10000
      WHEN 'agency'  THEN 100000
      ELSE 100
    END,
    CASE _plan
      WHEN 'starter' THEN 100000
      WHEN 'growth'  THEN 1000000
      WHEN 'agency'  THEN 10000000
      ELSE 10000
    END,
    CASE _plan
      WHEN 'starter' THEN 5
      WHEN 'growth'  THEN 20
      WHEN 'agency'  THEN 2147483647
      ELSE 1
    END,
    CASE _plan
      WHEN 'starter' THEN 1000
      WHEN 'growth'  THEN 10000
      WHEN 'agency'  THEN 100000
      ELSE 100
    END,
    CASE _plan
      WHEN 'starter' THEN 60
      WHEN 'growth'  THEN 180
      WHEN 'agency'  THEN 300
      ELSE 30
    END,
    CASE _plan WHEN 'free' THEN false ELSE true END,
    CASE _plan WHEN 'free' THEN 1 ELSE 2147483647 END,
    CASE _plan
      WHEN 'starter' THEN 90
      WHEN 'growth'  THEN 365
      WHEN 'agency'  THEN 36500
      ELSE 30
    END,
    1;
$function$;

-- 3. Update admin_overview_stats MRR mapping (scale -> agency)
CREATE OR REPLACE FUNCTION public.admin_overview_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    mrr AS (
      SELECT
        COALESCE(SUM(CASE plan_tier
          WHEN 'starter' THEN 29
          WHEN 'growth' THEN 79
          WHEN 'agency' THEN 199
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
$function$;