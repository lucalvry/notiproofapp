-- PHASE 1: Cleanup duplicate announcement events
-- Keep only the newest announcement per widget/title combination
DELETE FROM events 
WHERE id NOT IN (
  SELECT DISTINCT ON (widget_id, event_data->>'title') id
  FROM events
  WHERE event_type = 'announcement'
  ORDER BY widget_id, event_data->>'title', created_at DESC
)
AND event_type = 'announcement';

-- PHASE 3: Create notification_weights table
CREATE TABLE IF NOT EXISTS notification_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  weight integer NOT NULL DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
  max_per_queue integer DEFAULT 10,
  ttl_days integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(website_id, event_type)
);

-- Add display_weight to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS display_weight integer DEFAULT 5 CHECK (display_weight >= 1 AND display_weight <= 10);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_weights_website ON notification_weights(website_id);

-- Insert default weights for common event types
-- These will be created per website when first accessed
CREATE OR REPLACE FUNCTION initialize_notification_weights(_website_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notification_weights (website_id, event_type, weight, max_per_queue, ttl_days)
  VALUES 
    (_website_id, 'purchase', 10, 20, 7),
    (_website_id, 'testimonial', 8, 15, 180),
    (_website_id, 'signup', 6, 20, 14),
    (_website_id, 'announcement', 4, 5, 30),
    (_website_id, 'live_visitors', 2, 3, 1)
  ON CONFLICT (website_id, event_type) DO NOTHING;
END;
$$;