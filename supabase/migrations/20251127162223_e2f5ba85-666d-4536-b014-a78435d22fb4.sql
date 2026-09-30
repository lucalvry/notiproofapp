-- Phase 1.1: Enhance subscription_plans table with all plan limits
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS storage_limit_bytes bigint,
ADD COLUMN IF NOT EXISTS video_max_duration_seconds integer,
ADD COLUMN IF NOT EXISTS testimonial_limit integer,
ADD COLUMN IF NOT EXISTS form_limit integer,
ADD COLUMN IF NOT EXISTS analytics_level text DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS has_white_label boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_api boolean DEFAULT false;

-- Phase 1.2: Create media table for upload tracking
CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_id uuid REFERENCES websites(id) ON DELETE SET NULL,
  type text NOT NULL, -- 'video', 'avatar', 'testimonial-image'
  file_size bigint NOT NULL,
  duration_seconds integer, -- For videos only
  cdn_url text NOT NULL,
  original_filename text,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast storage queries
CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at);

-- Enable RLS
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own media" ON media;
DROP POLICY IF EXISTS "Users can insert their own media" ON media;
DROP POLICY IF EXISTS "Users can delete their own media" ON media;

-- Policies
CREATE POLICY "Users can view their own media" ON media FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own media" ON media FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own media" ON media FOR DELETE USING (auth.uid() = user_id);

-- Phase 1.3: Create helper function for storage calculation
CREATE OR REPLACE FUNCTION get_user_storage_used(p_user_id uuid)
RETURNS bigint AS $$
  SELECT COALESCE(SUM(file_size), 0)::bigint
  FROM media
  WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Phase 1.4: Update existing plans with new limits
-- Free plan (100MB, 60s video, 10 testimonials, 1 form)
UPDATE subscription_plans 
SET 
  storage_limit_bytes = 104857600, -- 100MB
  video_max_duration_seconds = 60,
  testimonial_limit = 10,
  form_limit = 1,
  analytics_level = 'basic',
  has_white_label = false,
  has_api = false
WHERE name = 'Free' AND storage_limit_bytes IS NULL;

-- Starter plan (5GB, 120s video, unlimited testimonials, 3 forms)
UPDATE subscription_plans 
SET 
  storage_limit_bytes = 5368709120, -- 5GB
  video_max_duration_seconds = 120,
  testimonial_limit = NULL, -- Unlimited
  form_limit = 3,
  analytics_level = 'standard',
  has_white_label = false,
  has_api = false
WHERE name = 'Starter' AND storage_limit_bytes IS NULL;

-- Standard plan (15GB, 180s video, unlimited testimonials, 5 forms, partial white label, API)
UPDATE subscription_plans 
SET 
  storage_limit_bytes = 16106127360, -- 15GB
  video_max_duration_seconds = 180,
  testimonial_limit = NULL, -- Unlimited
  form_limit = 5,
  analytics_level = 'advanced',
  has_white_label = true,
  has_api = true
WHERE name = 'Standard' AND storage_limit_bytes IS NULL;

-- Pro plan (50GB, 240s video, unlimited testimonials, unlimited forms, white label, API)
UPDATE subscription_plans 
SET 
  storage_limit_bytes = 53687091200, -- 50GB
  video_max_duration_seconds = 240,
  testimonial_limit = NULL, -- Unlimited
  form_limit = NULL, -- Unlimited
  analytics_level = 'premium',
  has_white_label = true,
  has_api = true
WHERE name = 'Pro' AND storage_limit_bytes IS NULL;

-- Business plan (200GB, 360s video, unlimited testimonials, unlimited forms, white label, API)
UPDATE subscription_plans 
SET 
  storage_limit_bytes = 214748364800, -- 200GB
  video_max_duration_seconds = 360,
  testimonial_limit = NULL, -- Unlimited
  form_limit = NULL, -- Unlimited
  analytics_level = 'enterprise',
  has_white_label = true,
  has_api = true
WHERE name = 'Business' AND storage_limit_bytes IS NULL;