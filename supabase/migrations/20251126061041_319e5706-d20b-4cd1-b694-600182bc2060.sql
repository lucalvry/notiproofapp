-- Super Admin Bypass: Update quota functions

-- Update check_event_quota to bypass for superadmins
CREATE OR REPLACE FUNCTION public.check_event_quota(_user_id uuid, _events_to_add integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month TEXT;
  usage_record RECORD;
  subscription_record RECORD;
  quota_limit INTEGER;
BEGIN
  -- Super admin bypass
  IF public.is_superadmin(_user_id) THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'quota_remaining', 999999999,
      'quota_limit', 999999999,
      'usage_percentage', 0,
      'is_superadmin', true
    );
  END IF;

  -- Get current month in YYYY-MM format
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get user's subscription and quota
  SELECT us.*, sp.max_events_per_month
  INTO subscription_record
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = _user_id
    AND us.status IN ('active', 'trialing')
  LIMIT 1;
  
  -- If no active subscription, deny
  IF subscription_record IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'no_active_subscription',
      'quota_remaining', 0,
      'quota_limit', 0
    );
  END IF;
  
  quota_limit := COALESCE(subscription_record.max_events_per_month, 0);
  
  -- Get or create usage record
  SELECT * INTO usage_record
  FROM event_usage_tracking
  WHERE user_id = _user_id AND month_year = current_month;
  
  IF usage_record IS NULL THEN
    -- Create new usage record for this month
    INSERT INTO event_usage_tracking (user_id, month_year, events_used, events_quota)
    VALUES (_user_id, current_month, 0, quota_limit)
    RETURNING * INTO usage_record;
  END IF;
  
  -- Check if adding events would exceed quota
  IF (usage_record.events_used + _events_to_add) > quota_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'quota_remaining', GREATEST(0, quota_limit - usage_record.events_used),
      'quota_limit', quota_limit,
      'events_used', usage_record.events_used
    );
  END IF;
  
  -- Quota available
  RETURN jsonb_build_object(
    'allowed', true,
    'quota_remaining', quota_limit - usage_record.events_used - _events_to_add,
    'quota_limit', quota_limit,
    'events_used', usage_record.events_used
  );
END;
$function$;

-- Update get_user_event_usage to bypass for superadmins
CREATE OR REPLACE FUNCTION public.get_user_event_usage(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month TEXT;
  usage_record RECORD;
  subscription_record RECORD;
  quota_limit INTEGER;
BEGIN
  -- Super admin bypass
  IF public.is_superadmin(_user_id) THEN
    RETURN jsonb_build_object(
      'events_used', 0,
      'quota_limit', 999999999,
      'quota_remaining', 999999999,
      'usage_percentage', 0,
      'is_superadmin', true
    );
  END IF;

  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get subscription quota
  SELECT sp.max_events_per_month
  INTO quota_limit
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = _user_id
    AND us.status IN ('active', 'trialing')
  LIMIT 1;
  
  quota_limit := COALESCE(quota_limit, 0);
  
  -- Get usage record
  SELECT * INTO usage_record
  FROM event_usage_tracking
  WHERE user_id = _user_id AND month_year = current_month;
  
  IF usage_record IS NULL THEN
    RETURN jsonb_build_object(
      'events_used', 0,
      'quota_limit', quota_limit,
      'quota_remaining', quota_limit,
      'usage_percentage', 0
    );
  END IF;
  
  RETURN jsonb_build_object(
    'events_used', usage_record.events_used,
    'quota_limit', quota_limit,
    'quota_remaining', GREATEST(0, quota_limit - usage_record.events_used),
    'usage_percentage', CASE 
      WHEN quota_limit > 0 THEN ROUND((usage_record.events_used::NUMERIC / quota_limit::NUMERIC) * 100, 2)
      ELSE 0 
    END
  );
END;
$function$;