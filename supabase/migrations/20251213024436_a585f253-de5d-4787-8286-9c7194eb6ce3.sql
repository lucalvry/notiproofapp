-- Add UTM settings columns to website_settings
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS utm_enabled BOOLEAN DEFAULT false;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS utm_source TEXT DEFAULT 'notiproof';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS utm_medium TEXT DEFAULT 'notification';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS utm_campaign_template TEXT DEFAULT '{{campaign_name}}';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS utm_content_template TEXT DEFAULT '{{notification_type}}';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS utm_override_existing BOOLEAN DEFAULT false;

-- Create impact_goals table for conversion goal tracking
CREATE TABLE IF NOT EXISTS public.impact_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('exact', 'contains')),
  match_value TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('click', 'hover', 'click_or_hover')),
  conversion_window_days INTEGER NOT NULL DEFAULT 30,
  monetary_value NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on impact_goals
ALTER TABLE public.impact_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for impact_goals
CREATE POLICY "Users can view their own goals"
  ON public.impact_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON public.impact_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.impact_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.impact_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Create impact_conversions table for tracking attributed conversions
CREATE TABLE IF NOT EXISTS public.impact_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL REFERENCES impact_goals(id) ON DELETE CASCADE,
  notification_id TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  visitor_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  interaction_timestamp TIMESTAMPTZ NOT NULL,
  conversion_timestamp TIMESTAMPTZ DEFAULT now(),
  page_url TEXT,
  monetary_value NUMERIC(10,2) DEFAULT 0,
  dedup_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on impact_conversions
ALTER TABLE public.impact_conversions ENABLE ROW LEVEL SECURITY;

-- RLS policies for impact_conversions
CREATE POLICY "Users can view their own conversions"
  ON public.impact_conversions FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for dedup_key for fast uniqueness checks
CREATE INDEX IF NOT EXISTS idx_impact_conversions_dedup_key ON public.impact_conversions(dedup_key);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_impact_conversions_goal_id ON public.impact_conversions(goal_id);
CREATE INDEX IF NOT EXISTS idx_impact_conversions_website_id ON public.impact_conversions(website_id);
CREATE INDEX IF NOT EXISTS idx_impact_conversions_created_at ON public.impact_conversions(created_at);
CREATE INDEX IF NOT EXISTS idx_impact_goals_website_id ON public.impact_goals(website_id);

-- Create trigger for updated_at on impact_goals
CREATE TRIGGER update_impact_goals_updated_at
  BEFORE UPDATE ON public.impact_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();