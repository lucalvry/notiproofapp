-- Phase 1: Database Schema Updates for New Pricing Structure (Fixed)

-- 1.1 Add new columns to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS can_remove_branding boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_domain_enabled boolean DEFAULT false;

-- 1.2 Update ALL plan values with new structure

-- Update Starter plan
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
  has_api = false
WHERE name = 'Starter';

-- Update Standard plan  
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
  has_white_label = true, -- Partial
  has_api = true
WHERE name = 'Standard';

-- Update Pro plan
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
  has_white_label = true, -- Full
  has_api = true
WHERE name = 'Pro';

-- Update Business plan
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
  has_white_label = true, -- Full
  has_api = true
WHERE name = 'Business';