-- =====================================================
-- POST-LAUNCH: ATTRIBUTION & ANALYTICS SYSTEM
-- =====================================================
-- This migration adds comprehensive conversion tracking,
-- revenue attribution, and influenced revenue metrics

-- 1. CONVERSION TRACKING TABLE
-- Tracks when notifications lead to conversions
CREATE TABLE IF NOT EXISTS public.notification_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  
  -- Conversion details
  conversion_type TEXT NOT NULL, -- 'purchase', 'signup', 'download', 'custom'
  conversion_value DECIMAL(10, 2) DEFAULT 0, -- Revenue in user's currency
  currency TEXT DEFAULT 'USD',
  
  -- Attribution model
  attribution_type TEXT NOT NULL, -- 'direct', 'assisted', 'influenced'
  attribution_weight DECIMAL(3, 2) DEFAULT 1.0, -- 0.0 to 1.0 for multi-touch
  
  -- User journey data
  visitor_id TEXT, -- Anonymous visitor ID from localStorage
  session_id TEXT, -- User session ID
  time_to_conversion INTERVAL, -- Time from notification view to conversion
  touchpoints_count INTEGER DEFAULT 1, -- How many notifications user saw
  
  -- Metadata
  conversion_data JSONB DEFAULT '{}', -- Additional conversion details
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for analytics queries
  CONSTRAINT valid_attribution_type CHECK (attribution_type IN ('direct', 'assisted', 'influenced')),
  CONSTRAINT valid_conversion_type CHECK (conversion_type IN ('purchase', 'signup', 'download', 'lead', 'custom'))
);

-- Indexes for performance
CREATE INDEX idx_conversions_user_id ON public.notification_conversions(user_id);
CREATE INDEX idx_conversions_website_id ON public.notification_conversions(website_id);
CREATE INDEX idx_conversions_campaign_id ON public.notification_conversions(campaign_id);
CREATE INDEX idx_conversions_created_at ON public.notification_conversions(created_at DESC);
CREATE INDEX idx_conversions_type ON public.notification_conversions(conversion_type);
CREATE INDEX idx_conversions_visitor ON public.notification_conversions(visitor_id, session_id);

-- 2. REVENUE ATTRIBUTION SUMMARY (Materialized for performance)
CREATE TABLE IF NOT EXISTS public.campaign_revenue_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Time period (for daily/weekly/monthly aggregation)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  
  -- Revenue metrics
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  direct_revenue DECIMAL(10, 2) DEFAULT 0, -- Last-click attribution
  assisted_revenue DECIMAL(10, 2) DEFAULT 0, -- Multi-touch assisted
  influenced_revenue DECIMAL(10, 2) DEFAULT 0, -- Any touchpoint
  
  -- Conversion metrics
  total_conversions INTEGER DEFAULT 0,
  direct_conversions INTEGER DEFAULT 0,
  assisted_conversions INTEGER DEFAULT 0,
  
  -- Averages
  avg_conversion_value DECIMAL(10, 2) DEFAULT 0,
  avg_time_to_conversion INTERVAL,
  
  currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_period_type CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  CONSTRAINT unique_campaign_period UNIQUE(campaign_id, period_start, period_end, period_type)
);

CREATE INDEX idx_revenue_stats_campaign ON public.campaign_revenue_stats(campaign_id);
CREATE INDEX idx_revenue_stats_period ON public.campaign_revenue_stats(period_start, period_end);

-- 3. VISITOR JOURNEY TABLE
-- Tracks which notifications a visitor saw before converting
CREATE TABLE IF NOT EXISTS public.visitor_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  
  -- Journey tracking
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notifications_viewed JSONB DEFAULT '[]', -- Array of {campaign_id, event_id, timestamp}
  converted BOOLEAN DEFAULT FALSE,
  conversion_id UUID REFERENCES public.notification_conversions(id) ON DELETE SET NULL,
  
  -- Session metadata
  device_type TEXT,
  country TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  
  CONSTRAINT unique_visitor_session UNIQUE(visitor_id, session_id)
);

CREATE INDEX idx_journeys_visitor ON public.visitor_journeys(visitor_id);
CREATE INDEX idx_journeys_session ON public.visitor_journeys(session_id);
CREATE INDEX idx_journeys_website ON public.visitor_journeys(website_id);

-- 4. GOOGLE ANALYTICS INTEGRATION TABLE
CREATE TABLE IF NOT EXISTS public.ga_integration_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  
  -- GA4 Configuration
  measurement_id TEXT NOT NULL, -- GA4 Measurement ID (G-XXXXXXXXXX)
  api_secret TEXT, -- GA4 Measurement Protocol API secret (encrypted)
  
  -- Event mapping
  event_mapping JSONB DEFAULT '{
    "notification_view": "notification_impression",
    "notification_click": "notification_click",
    "conversion": "notification_conversion"
  }',
  
  -- Settings
  enabled BOOLEAN DEFAULT TRUE,
  send_revenue BOOLEAN DEFAULT TRUE,
  send_user_properties BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_ga_website UNIQUE(website_id)
);

-- 5. FUNCTIONS FOR ATTRIBUTION CALCULATION

-- Function to record a conversion
CREATE OR REPLACE FUNCTION public.record_conversion(
  _visitor_id TEXT,
  _session_id TEXT,
  _website_id UUID,
  _conversion_type TEXT,
  _conversion_value DECIMAL DEFAULT 0,
  _conversion_data JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  journey_record RECORD;
  conversion_id UUID;
  last_campaign_id UUID;
  last_event_id UUID;
  user_id_val UUID;
  touchpoint_count INTEGER;
  time_diff INTERVAL;
BEGIN
  -- Get visitor journey
  SELECT * INTO journey_record
  FROM public.visitor_journeys
  WHERE visitor_id = _visitor_id 
    AND session_id = _session_id
  ORDER BY last_seen_at DESC
  LIMIT 1;
  
  IF journey_record IS NULL THEN
    RAISE EXCEPTION 'No journey found for visitor';
  END IF;
  
  -- Get user_id from website
  SELECT w.user_id INTO user_id_val
  FROM public.websites w
  WHERE w.id = _website_id;
  
  -- Get last touchpoint
  SELECT 
    (jsonb_array_elements(journey_record.notifications_viewed)->>'campaign_id')::UUID,
    (jsonb_array_elements(journey_record.notifications_viewed)->>'event_id')::UUID
  INTO last_campaign_id, last_event_id
  FROM jsonb_array_elements(journey_record.notifications_viewed)
  ORDER BY (jsonb_array_elements(journey_record.notifications_viewed)->>'timestamp')::TIMESTAMP DESC
  LIMIT 1;
  
  -- Count touchpoints
  touchpoint_count := jsonb_array_length(journey_record.notifications_viewed);
  
  -- Calculate time to conversion
  time_diff := NOW() - journey_record.first_seen_at;
  
  -- Create conversion record (direct attribution to last touchpoint)
  INSERT INTO public.notification_conversions (
    user_id,
    website_id,
    campaign_id,
    event_id,
    conversion_type,
    conversion_value,
    attribution_type,
    visitor_id,
    session_id,
    time_to_conversion,
    touchpoints_count,
    conversion_data
  ) VALUES (
    user_id_val,
    _website_id,
    last_campaign_id,
    last_event_id,
    _conversion_type,
    _conversion_value,
    'direct',
    _visitor_id,
    _session_id,
    time_diff,
    touchpoint_count,
    _conversion_data
  ) RETURNING id INTO conversion_id;
  
  -- Create assisted attributions for other touchpoints
  IF touchpoint_count > 1 THEN
    INSERT INTO public.notification_conversions (
      user_id,
      website_id,
      campaign_id,
      event_id,
      conversion_type,
      conversion_value,
      attribution_type,
      attribution_weight,
      visitor_id,
      session_id,
      time_to_conversion,
      touchpoints_count,
      conversion_data
    )
    SELECT 
      user_id_val,
      _website_id,
      (elem->>'campaign_id')::UUID,
      (elem->>'event_id')::UUID,
      _conversion_type,
      _conversion_value / touchpoint_count, -- Distribute revenue equally
      'assisted',
      1.0 / touchpoint_count, -- Weight by position
      _visitor_id,
      _session_id,
      time_diff,
      touchpoint_count,
      _conversion_data
    FROM jsonb_array_elements(journey_record.notifications_viewed) elem
    WHERE (elem->>'campaign_id')::UUID != last_campaign_id;
  END IF;
  
  -- Mark journey as converted
  UPDATE public.visitor_journeys
  SET converted = TRUE, conversion_id = conversion_id
  WHERE id = journey_record.id;
  
  RETURN conversion_id;
END;
$$;

-- Function to refresh revenue stats
CREATE OR REPLACE FUNCTION public.refresh_revenue_stats(
  _campaign_id UUID,
  _period_type TEXT DEFAULT 'daily'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_start_val DATE;
  period_end_val DATE;
  user_id_val UUID;
BEGIN
  -- Get campaign user
  SELECT c.user_id INTO user_id_val
  FROM public.campaigns c
  WHERE c.id = _campaign_id;
  
  -- Calculate period boundaries
  IF _period_type = 'daily' THEN
    period_start_val := CURRENT_DATE;
    period_end_val := CURRENT_DATE;
  ELSIF _period_type = 'weekly' THEN
    period_start_val := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    period_end_val := (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE;
  ELSIF _period_type = 'monthly' THEN
    period_start_val := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    period_end_val := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  END IF;
  
  -- Upsert stats
  INSERT INTO public.campaign_revenue_stats (
    campaign_id,
    user_id,
    period_start,
    period_end,
    period_type,
    total_revenue,
    direct_revenue,
    assisted_revenue,
    influenced_revenue,
    total_conversions,
    direct_conversions,
    assisted_conversions,
    avg_conversion_value,
    avg_time_to_conversion
  )
  SELECT 
    _campaign_id,
    user_id_val,
    period_start_val,
    period_end_val,
    _period_type,
    SUM(conversion_value) as total_revenue,
    SUM(CASE WHEN attribution_type = 'direct' THEN conversion_value ELSE 0 END) as direct_revenue,
    SUM(CASE WHEN attribution_type = 'assisted' THEN conversion_value ELSE 0 END) as assisted_revenue,
    SUM(conversion_value) as influenced_revenue,
    COUNT(*) as total_conversions,
    COUNT(*) FILTER (WHERE attribution_type = 'direct') as direct_conversions,
    COUNT(*) FILTER (WHERE attribution_type = 'assisted') as assisted_conversions,
    AVG(conversion_value) as avg_conversion_value,
    AVG(time_to_conversion) as avg_time_to_conversion
  FROM public.notification_conversions
  WHERE campaign_id = _campaign_id
    AND created_at::DATE BETWEEN period_start_val AND period_end_val
  GROUP BY campaign_id
  ON CONFLICT (campaign_id, period_start, period_end, period_type)
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    direct_revenue = EXCLUDED.direct_revenue,
    assisted_revenue = EXCLUDED.assisted_revenue,
    influenced_revenue = EXCLUDED.influenced_revenue,
    total_conversions = EXCLUDED.total_conversions,
    direct_conversions = EXCLUDED.direct_conversions,
    assisted_conversions = EXCLUDED.assisted_conversions,
    avg_conversion_value = EXCLUDED.avg_conversion_value,
    avg_time_to_conversion = EXCLUDED.avg_time_to_conversion,
    updated_at = NOW();
END;
$$;

-- 6. RLS POLICIES

ALTER TABLE public.notification_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_revenue_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga_integration_config ENABLE ROW LEVEL SECURITY;

-- Conversions: Users can only see their own
CREATE POLICY "Users can view own conversions"
  ON public.notification_conversions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversions"
  ON public.notification_conversions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Revenue stats: Users can only see their own
CREATE POLICY "Users can view own revenue stats"
  ON public.campaign_revenue_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Visitor journeys: Website owners can see their journeys
CREATE POLICY "Website owners can view journeys"
  ON public.visitor_journeys FOR SELECT
  USING (
    website_id IN (
      SELECT id FROM public.websites WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert journeys"
  ON public.visitor_journeys FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update journeys"
  ON public.visitor_journeys FOR UPDATE
  USING (true);

-- GA config: Users can manage their own
CREATE POLICY "Users can manage own GA config"
  ON public.ga_integration_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. TRIGGERS

-- Auto-refresh revenue stats when conversion is added
CREATE OR REPLACE FUNCTION public.trigger_refresh_revenue_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.refresh_revenue_stats(NEW.campaign_id, 'daily');
  PERFORM public.refresh_revenue_stats(NEW.campaign_id, 'weekly');
  PERFORM public.refresh_revenue_stats(NEW.campaign_id, 'monthly');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_conversion_refresh_stats
  AFTER INSERT ON public.notification_conversions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_refresh_revenue_stats();

COMMENT ON TABLE public.notification_conversions IS 'Tracks conversions attributed to notifications with multi-touch attribution support';
COMMENT ON TABLE public.campaign_revenue_stats IS 'Aggregated revenue and conversion metrics per campaign and time period';
COMMENT ON TABLE public.visitor_journeys IS 'Tracks visitor interactions with notifications across their session';
COMMENT ON TABLE public.ga_integration_config IS 'Google Analytics 4 Measurement Protocol integration configuration';