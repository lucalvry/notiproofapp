
-- ============================================================
-- Phase 1: Plan limit enforcement foundation
-- ============================================================

-- New columns
ALTER TABLE public.proof_objects
  ADD COLUMN IF NOT EXISTS media_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS media_duration_seconds numeric;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS extra_seats_purchased integer NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- Plan limits helper (mirrors src/lib/plans.ts — keep in sync!)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plan_limits(_plan text)
RETURNS TABLE (
  proof_limit         integer,
  event_limit         integer,
  domain_limit        integer,
  storage_mb          integer,
  max_video_seconds   integer,
  remove_branding     boolean,
  active_widget_limit integer,
  data_retention_days integer,
  team_seats_included integer
)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    CASE _plan
      WHEN 'starter' THEN 1000
      WHEN 'growth'  THEN 10000
      WHEN 'scale'   THEN 100000
      ELSE 100
    END,
    CASE _plan
      WHEN 'starter' THEN 100000
      WHEN 'growth'  THEN 1000000
      WHEN 'scale'   THEN 10000000
      ELSE 10000
    END,
    CASE _plan
      WHEN 'starter' THEN 5
      WHEN 'growth'  THEN 20
      WHEN 'scale'   THEN 2147483647   -- effectively unlimited
      ELSE 1
    END,
    CASE _plan
      WHEN 'starter' THEN 1000
      WHEN 'growth'  THEN 10000
      WHEN 'scale'   THEN 100000
      ELSE 100
    END,
    CASE _plan
      WHEN 'starter' THEN 60
      WHEN 'growth'  THEN 180
      WHEN 'scale'   THEN 300
      ELSE 30
    END,
    CASE _plan WHEN 'free' THEN false ELSE true END,
    CASE _plan WHEN 'free' THEN 1 ELSE 2147483647 END,
    CASE _plan
      WHEN 'starter' THEN 90
      WHEN 'growth'  THEN 365
      WHEN 'scale'   THEN 36500       -- ~unlimited
      ELSE 30
    END,
    1; -- teamSeatsIncluded — same for all plans today
$$;

-- ------------------------------------------------------------
-- Usage RPC
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.business_plan_usage(_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.is_business_member(_business_id) OR public.is_platform_admin()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT jsonb_build_object(
    'proofs_mtd',     (SELECT count(*)::int FROM public.proof_objects
                         WHERE business_id = _business_id
                           AND created_at >= date_trunc('month', now())),
    'events_mtd',     (SELECT count(*)::int FROM public.widget_events
                         WHERE business_id = _business_id
                           AND fired_at >= date_trunc('month', now())),
    'storage_bytes',  (SELECT COALESCE(SUM(media_size_bytes), 0)::bigint
                         FROM public.proof_objects WHERE business_id = _business_id),
    'active_widgets', (SELECT count(*)::int FROM public.widgets
                         WHERE business_id = _business_id AND status = 'active'),
    'domains',        (SELECT count(*)::int FROM public.business_domains
                         WHERE business_id = _business_id),
    'seats',          (SELECT count(*)::int FROM public.business_users
                         WHERE business_id = _business_id),
    'pending_invites',(SELECT count(*)::int FROM public.team_invitations
                         WHERE business_id = _business_id AND status = 'pending'),
    'extra_seats',    (SELECT COALESCE(extra_seats_purchased, 0)
                         FROM public.businesses WHERE id = _business_id)
  ) INTO result;

  RETURN result;
END;
$$;

-- ------------------------------------------------------------
-- Capability RPCs
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_add_domain(_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_key text;
  lim integer;
  used integer;
BEGIN
  SELECT plan INTO plan_key FROM public.businesses WHERE id = _business_id;
  IF plan_key IS NULL THEN RETURN false; END IF;
  SELECT domain_limit INTO lim FROM public.plan_limits(plan_key);
  SELECT count(*)::int INTO used FROM public.business_domains WHERE business_id = _business_id;
  RETURN used < lim;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_activate_widget(_business_id uuid, _exclude_widget uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_key text;
  lim integer;
  used integer;
BEGIN
  SELECT plan INTO plan_key FROM public.businesses WHERE id = _business_id;
  IF plan_key IS NULL THEN RETURN false; END IF;
  SELECT active_widget_limit INTO lim FROM public.plan_limits(plan_key);
  SELECT count(*)::int INTO used FROM public.widgets
    WHERE business_id = _business_id AND status = 'active'
      AND (_exclude_widget IS NULL OR id <> _exclude_widget);
  RETURN used < lim;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_create_proof(_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_key text;
  lim integer;
  used integer;
BEGIN
  SELECT plan INTO plan_key FROM public.businesses WHERE id = _business_id;
  IF plan_key IS NULL THEN RETURN false; END IF;
  SELECT proof_limit INTO lim FROM public.plan_limits(plan_key);
  SELECT count(*)::int INTO used FROM public.proof_objects
    WHERE business_id = _business_id AND created_at >= date_trunc('month', now());
  RETURN used < lim;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_invite_seat(_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_key text;
  included integer;
  extra integer;
  members integer;
  pending integer;
BEGIN
  SELECT plan, COALESCE(extra_seats_purchased, 0) INTO plan_key, extra
    FROM public.businesses WHERE id = _business_id;
  IF plan_key IS NULL THEN RETURN false; END IF;
  SELECT team_seats_included INTO included FROM public.plan_limits(plan_key);
  SELECT count(*)::int INTO members FROM public.business_users WHERE business_id = _business_id;
  SELECT count(*)::int INTO pending  FROM public.team_invitations
    WHERE business_id = _business_id AND status = 'pending';
  RETURN (members + pending) < (included + extra);
END;
$$;

-- ------------------------------------------------------------
-- Triggers — domain + active widget guards
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_domain_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_add_domain(NEW.business_id) THEN
    RAISE EXCEPTION 'Domain limit reached for current plan' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_domain_limit ON public.business_domains;
CREATE TRIGGER trg_enforce_domain_limit
BEFORE INSERT ON public.business_domains
FOR EACH ROW EXECUTE FUNCTION public.enforce_domain_limit();

CREATE OR REPLACE FUNCTION public.enforce_active_widget_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status <> 'active') THEN
    IF NOT public.can_activate_widget(NEW.business_id, NEW.id) THEN
      RAISE EXCEPTION 'Active widget limit reached for current plan' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_active_widget_limit ON public.widgets;
CREATE TRIGGER trg_enforce_active_widget_limit
BEFORE INSERT OR UPDATE OF status ON public.widgets
FOR EACH ROW EXECUTE FUNCTION public.enforce_active_widget_limit();
