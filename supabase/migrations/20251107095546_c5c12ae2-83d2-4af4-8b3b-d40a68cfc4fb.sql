-- Phase 1: Create event usage tracking table
CREATE TABLE IF NOT EXISTS public.event_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  events_used INTEGER NOT NULL DEFAULT 0,
  events_quota INTEGER NOT NULL,
  last_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_usage_user_month ON public.event_usage_tracking(user_id, month_year);

-- Enable RLS
ALTER TABLE public.event_usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own usage"
  ON public.event_usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage"
  ON public.event_usage_tracking FOR SELECT
  USING (is_admin(auth.uid()));

-- Phase 2: Add polling configuration to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS polling_config JSONB DEFAULT jsonb_build_object(
  'enabled', false,
  'interval_minutes', 5,
  'max_events_per_fetch', 10,
  'last_poll_at', NULL
);

-- Add polling limits to subscription plans
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS polling_limits JSONB DEFAULT jsonb_build_object(
  'min_interval_minutes', 5,
  'max_interval_minutes', 60,
  'max_events_per_fetch', 50,
  'allow_realtime', false
);

-- Update existing subscription plans with appropriate limits
UPDATE public.subscription_plans
SET polling_limits = jsonb_build_object(
  'min_interval_minutes', 15,
  'max_interval_minutes', 60,
  'max_events_per_fetch', 10,
  'allow_realtime', false
)
WHERE name = 'Starter';

UPDATE public.subscription_plans
SET polling_limits = jsonb_build_object(
  'min_interval_minutes', 5,
  'max_interval_minutes', 60,
  'max_events_per_fetch', 50,
  'allow_realtime', true
)
WHERE name = 'Pro';

UPDATE public.subscription_plans
SET polling_limits = jsonb_build_object(
  'min_interval_minutes', 1,
  'max_interval_minutes', 60,
  'max_events_per_fetch', 100,
  'allow_realtime', true
)
WHERE name = 'Business';

-- Function to check if user has available event quota
CREATE OR REPLACE FUNCTION public.check_event_quota(
  _user_id UUID,
  _events_to_add INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month TEXT;
  usage_record RECORD;
  subscription_record RECORD;
  quota_limit INTEGER;
BEGIN
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
$$;

-- Function to increment event usage
CREATE OR REPLACE FUNCTION public.increment_event_usage(
  _user_id UUID,
  _events_count INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month TEXT;
  usage_record RECORD;
  subscription_record RECORD;
  quota_limit INTEGER;
BEGIN
  -- Get current month
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get user's quota
  SELECT us.*, sp.max_events_per_month
  INTO subscription_record
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = _user_id
    AND us.status IN ('active', 'trialing')
  LIMIT 1;
  
  quota_limit := COALESCE(subscription_record.max_events_per_month, 0);
  
  -- Update or insert usage
  INSERT INTO event_usage_tracking (user_id, month_year, events_used, events_quota)
  VALUES (_user_id, current_month, _events_count, quota_limit)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    events_used = event_usage_tracking.events_used + _events_count,
    updated_at = NOW()
  RETURNING * INTO usage_record;
  
  RETURN jsonb_build_object(
    'success', true,
    'events_used', usage_record.events_used,
    'quota_limit', quota_limit,
    'quota_remaining', GREATEST(0, quota_limit - usage_record.events_used)
  );
END;
$$;

-- Function to get user's current usage stats
CREATE OR REPLACE FUNCTION public.get_user_event_usage(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month TEXT;
  usage_record RECORD;
  subscription_record RECORD;
  quota_limit INTEGER;
BEGIN
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
$$;