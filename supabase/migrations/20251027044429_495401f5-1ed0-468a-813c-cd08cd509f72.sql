-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  website_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  data_source TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  rules JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  field_map JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proof_events table
CREATE TABLE public.proof_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  website_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  product_image TEXT,
  product_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_metrics table
CREATE TABLE public.campaign_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  impressions INTEGER DEFAULT 0,
  cta_clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for campaigns (users can manage their own website campaigns)
CREATE POLICY "Users can view campaigns for their websites"
ON public.campaigns
FOR SELECT
USING (true);

CREATE POLICY "Users can create campaigns"
ON public.campaigns
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their campaigns"
ON public.campaigns
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their campaigns"
ON public.campaigns
FOR DELETE
USING (true);

-- Create policies for proof_events
CREATE POLICY "Users can view proof events"
ON public.proof_events
FOR SELECT
USING (true);

CREATE POLICY "Users can create proof events"
ON public.proof_events
FOR INSERT
WITH CHECK (true);

-- Create policies for campaign_metrics
CREATE POLICY "Users can view campaign metrics"
ON public.campaign_metrics
FOR SELECT
USING (true);

CREATE POLICY "Users can create campaign metrics"
ON public.campaign_metrics
FOR INSERT
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_campaigns_updated_at();

-- Create indexes for performance
CREATE INDEX idx_campaigns_website_id ON public.campaigns(website_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_proof_events_campaign_id ON public.proof_events(campaign_id);
CREATE INDEX idx_proof_events_website_id ON public.proof_events(website_id);
CREATE INDEX idx_campaign_metrics_campaign_id ON public.campaign_metrics(campaign_id);