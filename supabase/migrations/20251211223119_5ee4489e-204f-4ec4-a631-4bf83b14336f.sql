-- Fix remaining security issues

-- ============================================
-- 1. FIX SECURITY DEFINER VIEWS
-- Replace with SECURITY INVOKER (default behavior)
-- ============================================

-- Recreate subscription_plans_public view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.subscription_plans_public;

CREATE VIEW public.subscription_plans_public 
WITH (security_invoker = true)
AS
SELECT 
  id, name, price_monthly, price_yearly, max_events_per_month, 
  max_websites, features, is_active, trial_period_days,
  can_remove_branding, has_api, has_white_label, analytics_level,
  storage_limit_bytes, testimonial_limit, form_limit, video_max_duration_seconds
FROM public.subscription_plans
WHERE is_active = true;

GRANT SELECT ON public.subscription_plans_public TO anon, authenticated;

-- ============================================
-- 2. FIX REMAINING FUNCTION SEARCH PATHS
-- ============================================

-- Fix poll_active_campaigns
CREATE OR REPLACE FUNCTION public.poll_active_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  campaign_record RECORD;
  polling_config JSONB;
  last_poll TIMESTAMP WITH TIME ZONE;
  interval_minutes INTEGER;
  next_poll_time TIMESTAMP WITH TIME ZONE;
BEGIN
  FOR campaign_record IN
    SELECT 
      c.id,
      c.user_id,
      c.website_id,
      c.polling_config
    FROM campaigns c
    WHERE c.status = 'active'
      AND EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(c.data_sources) AS source
        WHERE source->>'provider' = 'ga4'
      )
      AND (c.polling_config->>'enabled')::boolean = true
  LOOP
    polling_config := campaign_record.polling_config;
    last_poll := (polling_config->>'last_poll_at')::timestamp with time zone;
    interval_minutes := COALESCE((polling_config->>'interval_minutes')::integer, 5);
    
    IF last_poll IS NULL THEN
      next_poll_time := NOW() - INTERVAL '1 minute';
    ELSE
      next_poll_time := last_poll + (interval_minutes || ' minutes')::interval;
    END IF;
    
    IF NOW() >= next_poll_time THEN
      RAISE NOTICE 'Polling campaign % for user %', campaign_record.id, campaign_record.user_id;
    END IF;
  END LOOP;
END;
$function$;

-- Fix update_user_role
CREATE OR REPLACE FUNCTION public.update_user_role(_user_id uuid, _new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  
  UPDATE public.profiles 
  SET role = _new_role
  WHERE id = _user_id;
  
  RETURN FOUND;
END;
$function$;