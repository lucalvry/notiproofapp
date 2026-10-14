CREATE OR REPLACE FUNCTION public.admin_dormant_users(_min_days integer DEFAULT 14)
RETURNS TABLE(user_id uuid, email text, full_name text, last_sign_in_at timestamptz, days_quiet integer, business_name text, plan text, emails jsonb, unsubscribed boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, au.last_sign_in_at,
    floor(extract(epoch from (now() - au.last_sign_in_at))/86400)::int,
    (SELECT b.name FROM business_users bu JOIN businesses b ON b.id = bu.business_id WHERE bu.user_id = u.id ORDER BY bu.created_at LIMIT 1),
    (SELECT b.plan_tier FROM business_users bu JOIN businesses b ON b.id = bu.business_id WHERE bu.user_id = u.id ORDER BY bu.created_at LIMIT 1),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('template', es.template, 'sent_at', es.created_at) ORDER BY es.created_at DESC)
      FROM email_sends es WHERE es.user_id = u.id AND (es.template LIKE 'winback%' OR es.template = 'reactivation_manual')), '[]'::jsonb),
    EXISTS (SELECT 1 FROM email_unsubscribes eu WHERE eu.email = u.email)
  FROM public.users u JOIN auth.users au ON au.id = u.id
  WHERE au.last_sign_in_at IS NOT NULL AND au.last_sign_in_at <= now() - make_interval(days => _min_days)
  ORDER BY au.last_sign_in_at ASC;
END $$;
REVOKE ALL ON FUNCTION public.admin_dormant_users(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_dormant_users(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.internal_dormant_users(_min_days integer)
RETURNS TABLE(user_id uuid, email text, full_name text, last_sign_in_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.id, u.email, u.full_name, au.last_sign_in_at
  FROM public.users u JOIN auth.users au ON au.id = u.id
  WHERE au.last_sign_in_at IS NOT NULL AND au.last_sign_in_at <= now() - make_interval(days => _min_days);
$$;
REVOKE ALL ON FUNCTION public.internal_dormant_users(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_dormant_users(integer) TO service_role;