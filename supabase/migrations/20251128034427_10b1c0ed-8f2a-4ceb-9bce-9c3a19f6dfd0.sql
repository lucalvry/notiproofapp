-- Phase 1: Add new columns to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS can_remove_branding boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_domain_enabled boolean DEFAULT false;

-- Phase 2: Create subscription_addons table for seat & storage purchases
CREATE TABLE IF NOT EXISTS subscription_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_type text NOT NULL, -- 'team_seat', 'storage_5gb', 'storage_20gb', 'storage_50gb', 'storage_100gb'
  quantity integer DEFAULT 1,
  price_monthly numeric(10,2),
  price_yearly numeric(10,2),
  stripe_subscription_item_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on subscription_addons
ALTER TABLE subscription_addons ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own addons
CREATE POLICY "Users can view their own addons" ON subscription_addons
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to manage their own addons
CREATE POLICY "Users can manage their own addons" ON subscription_addons
  FOR ALL USING (auth.uid() = user_id);

-- Phase 3: Update all plan values with new structure
-- FREE: 1 website, 1K views, 100MB storage, 30s video, NO branding removal, NO custom domain
UPDATE subscription_plans
SET 
  max_websites = 1,
  max_events_per_month = 1000,
  storage_limit_bytes = 104857600, -- 100MB
  video_max_duration_seconds = 30, -- 30 seconds
  testimonial_limit = NULL, -- Unlimited
  form_limit = NULL, -- Unlimited
  can_remove_branding = false,
  custom_domain_enabled = false,
  has_white_label = false,
  has_api = false,
  analytics_level = 'basic'
WHERE name = 'Free';

-- STARTER: 3 websites, 10K views, 1GB storage, 3min video, remove branding, custom domain
UPDATE subscription_plans
SET 
  max_websites = 3,
  max_events_per_month = 10000,
  storage_limit_bytes = 1073741824, -- 1GB
  video_max_duration_seconds = 180, -- 3 minutes
  testimonial_limit = NULL, -- Unlimited
  form_limit = NULL, -- Unlimited
  can_remove_branding = true,
  custom_domain_enabled = true,
  has_white_label = false,
  has_api = false,
  analytics_level = 'basic'
WHERE name = 'Starter';

-- STANDARD: 5 websites, 45K views, 5GB storage, 3min video, API, webhooks, partial white label
UPDATE subscription_plans
SET 
  max_websites = 5,
  max_events_per_month = 45000,
  storage_limit_bytes = 5368709120, -- 5GB
  video_max_duration_seconds = 180, -- 3 minutes
  testimonial_limit = NULL, -- Unlimited
  form_limit = NULL, -- Unlimited
  can_remove_branding = true,
  custom_domain_enabled = true,
  has_white_label = true, -- Partial white label
  has_api = true,
  analytics_level = 'standard'
WHERE name = 'Standard';

-- PRO: 10 websites, 100K views, 20GB storage, 5min video, full white label
UPDATE subscription_plans
SET 
  max_websites = 10,
  max_events_per_month = 100000,
  storage_limit_bytes = 21474836480, -- 20GB
  video_max_duration_seconds = 300, -- 5 minutes
  testimonial_limit = NULL, -- Unlimited
  form_limit = NULL, -- Unlimited
  can_remove_branding = true,
  custom_domain_enabled = true,
  has_white_label = true,
  has_api = true,
  analytics_level = 'advanced'
WHERE name = 'Pro';

-- BUSINESS: 20 websites, unlimited views, 100GB storage, 5min video, full white label
UPDATE subscription_plans
SET 
  max_websites = 20,
  max_events_per_month = NULL, -- Unlimited
  storage_limit_bytes = 107374182400, -- 100GB
  video_max_duration_seconds = 300, -- 5 minutes
  testimonial_limit = NULL, -- Unlimited
  form_limit = NULL, -- Unlimited
  can_remove_branding = true,
  custom_domain_enabled = true,
  has_white_label = true,
  has_api = true,
  analytics_level = 'advanced'
WHERE name = 'Business';