CREATE OR REPLACE FUNCTION public.business_is_unlimited(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.business_users bu JOIN public.users u ON u.id = bu.user_id
    WHERE bu.business_id = _business_id AND bu.role = 'owner' AND u.is_admin
  )
$$;
REVOKE EXECUTE ON FUNCTION public.business_is_unlimited(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.business_is_unlimited(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_create_proof(_business_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE plan_key text; lim integer; used integer;
BEGIN
  IF public.business_is_unlimited(_business_id) THEN RETURN true; END IF;
  SELECT plan INTO plan_key FROM public.businesses WHERE id = _business_id;
  IF plan_key IS NULL THEN RETURN false; END IF;
  SELECT proof_limit INTO lim FROM public.plan_limits(plan_key);
  SELECT count(*)::int INTO used FROM public.proof_objects
    WHERE business_id = _business_id AND created_at >= date_trunc('month', now());
  RETURN used < lim;
END; $function$;

CREATE OR REPLACE FUNCTION public.can_activate_widget(_business_id uuid, _exclude_widget uuid DEFAULT NULL::uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE plan_key text; lim integer; used integer;
BEGIN
  IF public.business_is_unlimited(_business_id) THEN RETURN true; END IF;
  SELECT plan INTO plan_key FROM public.businesses WHERE id = _business_id;
  IF plan_key IS NULL THEN RETURN false; END IF;
  SELECT active_widget_limit INTO lim FROM public.plan_limits(plan_key);
  SELECT count(*)::int INTO used FROM public.widgets
    WHERE business_id = _business_id AND status = 'active' AND (_exclude_widget IS NULL OR id <> _exclude_widget);
  RETURN used < lim;
END; $function$;

CREATE OR REPLACE FUNCTION public.can_add_domain(_business_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE plan_key text; lim integer; used integer;
BEGIN
  IF public.business_is_unlimited(_business_id) THEN RETURN true; END IF;
  SELECT plan INTO plan_key FROM public.businesses WHERE id = _business_id;
  IF plan_key IS NULL THEN RETURN false; END IF;
  SELECT domain_limit INTO lim FROM public.plan_limits(plan_key);
  SELECT count(*)::int INTO used FROM public.business_domains WHERE business_id = _business_id;
  RETURN used < lim;
END; $function$;

CREATE OR REPLACE FUNCTION public.can_invite_seat(_business_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE plan_key text; included integer; extra integer; members integer; pending integer;
BEGIN
  IF public.business_is_unlimited(_business_id) THEN RETURN true; END IF;
  SELECT plan, COALESCE(extra_seats_purchased, 0) INTO plan_key, extra FROM public.businesses WHERE id = _business_id;
  IF plan_key IS NULL THEN RETURN false; END IF;
  SELECT team_seats_included INTO included FROM public.plan_limits(plan_key);
  SELECT count(*)::int INTO members FROM public.business_users WHERE business_id = _business_id;
  SELECT count(*)::int INTO pending FROM public.team_invitations WHERE business_id = _business_id AND status = 'pending';
  RETURN (members + pending) < (included + extra);
END; $function$;

CREATE OR REPLACE FUNCTION public.can_upload_media(_business_id uuid, _additional_bytes bigint)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE plan_key text; cap_mb integer; used_bytes bigint;
BEGIN
  IF public.business_is_unlimited(_business_id) THEN RETURN true; END IF;
  SELECT plan INTO plan_key FROM public.businesses WHERE id = _business_id;
  IF plan_key IS NULL THEN RETURN false; END IF;
  SELECT storage_mb INTO cap_mb FROM public.plan_limits(plan_key);
  SELECT COALESCE(SUM(media_size_bytes), 0)::bigint INTO used_bytes FROM public.proof_objects WHERE business_id = _business_id;
  RETURN (used_bytes + COALESCE(_additional_bytes, 0)) <= (cap_mb::bigint * 1024 * 1024);
END; $function$;