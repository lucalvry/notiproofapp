-- Create A/B test tables for campaign optimization

-- A/B Tests table
CREATE TABLE IF NOT EXISTS public.ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, running, paused, completed
  traffic_split JSONB NOT NULL DEFAULT '{"type": "equal", "distribution": [50, 50]}', -- e.g., {"type": "equal", "distribution": [50, 50]} or {"type": "custom", "distribution": [33, 33, 34]}
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  winner_variant_id UUID,
  winner_declared_at TIMESTAMP WITH TIME ZONE,
  confidence_level NUMERIC DEFAULT 0, -- Statistical confidence percentage (0-100)
  total_views INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- A/B Test Variants table
CREATE TABLE IF NOT EXISTS public.ab_test_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_control BOOLEAN NOT NULL DEFAULT false,
  
  -- Variant configuration (what differs from control)
  message_template TEXT,
  style_config JSONB DEFAULT '{}', -- Colors, fonts, borders, etc.
  position TEXT, -- bottom-left, bottom-right, top-left, top-right, bottom-center
  animation TEXT, -- slide, fade, bounce, none
  timing_config JSONB DEFAULT '{}', -- display_duration, interval, delays
  
  -- Performance metrics
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ab_tests_campaign_id ON public.ab_tests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_user_id ON public.ab_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON public.ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test_id ON public.ab_test_variants(test_id);

-- Enable RLS
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ab_tests
CREATE POLICY "Users can view their own A/B tests"
  ON public.ab_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create A/B tests"
  ON public.ab_tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own A/B tests"
  ON public.ab_tests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own A/B tests"
  ON public.ab_tests FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all A/B tests"
  ON public.ab_tests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::text));

-- RLS Policies for ab_test_variants
CREATE POLICY "Users can view variants of their tests"
  ON public.ab_test_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ab_tests 
    WHERE ab_tests.id = ab_test_variants.test_id 
    AND ab_tests.user_id = auth.uid()
  ));

CREATE POLICY "Users can create variants for their tests"
  ON public.ab_test_variants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ab_tests 
    WHERE ab_tests.id = ab_test_variants.test_id 
    AND ab_tests.user_id = auth.uid()
  ));

CREATE POLICY "Users can update variants of their tests"
  ON public.ab_test_variants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.ab_tests 
    WHERE ab_tests.id = ab_test_variants.test_id 
    AND ab_tests.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete variants of their tests"
  ON public.ab_test_variants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ab_tests 
    WHERE ab_tests.id = ab_test_variants.test_id 
    AND ab_tests.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all variants"
  ON public.ab_test_variants FOR SELECT
  USING (has_role(auth.uid(), 'admin'::text));

-- Function to update ab_test metrics when variants change
CREATE OR REPLACE FUNCTION update_ab_test_metrics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ab_tests
  SET 
    total_views = (
      SELECT COALESCE(SUM(views), 0)
      FROM public.ab_test_variants
      WHERE test_id = NEW.test_id
    ),
    total_clicks = (
      SELECT COALESCE(SUM(clicks), 0)
      FROM public.ab_test_variants
      WHERE test_id = NEW.test_id
    ),
    updated_at = now()
  WHERE id = NEW.test_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update test metrics when variant metrics change
CREATE TRIGGER update_ab_test_metrics_trigger
  AFTER INSERT OR UPDATE OF views, clicks ON public.ab_test_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_test_metrics();

-- Function to calculate statistical significance (chi-square test)
CREATE OR REPLACE FUNCTION calculate_ab_test_confidence(test_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  variant_count INTEGER;
  chi_square NUMERIC := 0;
  expected_ctr NUMERIC;
  total_views INTEGER;
  total_clicks INTEGER;
  variant RECORD;
  confidence NUMERIC := 0;
BEGIN
  -- Get test totals
  SELECT t.total_views, t.total_clicks INTO total_views, total_clicks
  FROM public.ab_tests t
  WHERE t.id = test_uuid;
  
  IF total_views = 0 OR total_views < 100 THEN
    RETURN 0; -- Need minimum 100 views for statistical significance
  END IF;
  
  -- Calculate expected CTR
  expected_ctr := total_clicks::NUMERIC / total_views::NUMERIC;
  
  -- Calculate chi-square statistic
  FOR variant IN 
    SELECT views, clicks 
    FROM public.ab_test_variants 
    WHERE test_id = test_uuid AND views > 0
  LOOP
    DECLARE
      expected_clicks NUMERIC;
      observed_clicks NUMERIC;
    BEGIN
      expected_clicks := variant.views * expected_ctr;
      observed_clicks := variant.clicks;
      
      IF expected_clicks > 0 THEN
        chi_square := chi_square + POWER(observed_clicks - expected_clicks, 2) / expected_clicks;
      END IF;
    END;
  END LOOP;
  
  -- Get variant count
  SELECT COUNT(*) INTO variant_count FROM public.ab_test_variants WHERE test_id = test_uuid;
  
  -- Simplified confidence calculation based on chi-square
  -- For 2 variants (df=1): chi_square > 3.84 = 95% confidence
  -- For 3 variants (df=2): chi_square > 5.99 = 95% confidence
  IF variant_count = 2 AND chi_square > 3.84 THEN
    confidence := LEAST(95 + (chi_square - 3.84) * 2, 99.9);
  ELSIF variant_count = 3 AND chi_square > 5.99 THEN
    confidence := LEAST(95 + (chi_square - 5.99) * 2, 99.9);
  ELSIF chi_square > 2 THEN
    confidence := LEAST(chi_square * 15, 94.9); -- Gradual confidence below threshold
  END IF;
  
  RETURN ROUND(confidence, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to auto-declare winner at 95% confidence
CREATE OR REPLACE FUNCTION auto_declare_ab_test_winner(test_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  confidence_level NUMERIC;
  best_variant_id UUID;
  best_ctr NUMERIC := 0;
  variant RECORD;
  test_status TEXT;
BEGIN
  -- Check if test is running
  SELECT status INTO test_status FROM public.ab_tests WHERE id = test_uuid;
  
  IF test_status != 'running' THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate confidence
  confidence_level := calculate_ab_test_confidence(test_uuid);
  
  -- Update confidence in test
  UPDATE public.ab_tests 
  SET confidence_level = confidence_level 
  WHERE id = test_uuid;
  
  -- If confidence >= 95%, declare winner
  IF confidence_level >= 95 THEN
    -- Find variant with highest CTR
    FOR variant IN
      SELECT id, CASE WHEN views > 0 THEN (clicks::NUMERIC / views::NUMERIC) ELSE 0 END as ctr
      FROM public.ab_test_variants
      WHERE test_id = test_uuid
      ORDER BY ctr DESC
      LIMIT 1
    LOOP
      best_variant_id := variant.id;
      best_ctr := variant.ctr;
    END LOOP;
    
    -- Declare winner
    UPDATE public.ab_tests
    SET 
      winner_variant_id = best_variant_id,
      winner_declared_at = now(),
      status = 'completed',
      updated_at = now()
    WHERE id = test_uuid;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;