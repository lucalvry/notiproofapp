-- Create campaign_stats table for daily view/click aggregation
CREATE TABLE public.campaign_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, date)
);

-- Enable RLS
ALTER TABLE public.campaign_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own campaign stats
CREATE POLICY "Users can view own campaign stats"
ON public.campaign_stats
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM campaigns c
  WHERE c.id = campaign_stats.campaign_id
  AND c.user_id = auth.uid()
));

-- Policy: Allow anonymous inserts via widget-api (service role will handle this)
CREATE POLICY "Service role can manage campaign stats"
ON public.campaign_stats
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to increment campaign view
CREATE OR REPLACE FUNCTION public.increment_campaign_view(p_campaign_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO campaign_stats (campaign_id, date, views, clicks)
  VALUES (p_campaign_id, CURRENT_DATE, 1, 0)
  ON CONFLICT (campaign_id, date)
  DO UPDATE SET 
    views = campaign_stats.views + 1,
    updated_at = now();
END;
$$;

-- Create function to increment campaign click
CREATE OR REPLACE FUNCTION public.increment_campaign_click(p_campaign_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO campaign_stats (campaign_id, date, views, clicks)
  VALUES (p_campaign_id, CURRENT_DATE, 0, 1)
  ON CONFLICT (campaign_id, date)
  DO UPDATE SET 
    clicks = campaign_stats.clicks + 1,
    updated_at = now();
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.increment_campaign_view(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_campaign_click(UUID) TO service_role;

-- Create index for fast lookups
CREATE INDEX idx_campaign_stats_campaign_date ON public.campaign_stats(campaign_id, date DESC);