-- Phase 1: Fix Campaign-Widget Relationship
-- Step 1: Create default campaigns for orphaned widgets
WITH orphaned_widgets AS (
  SELECT DISTINCT user_id, website_id 
  FROM widgets 
  WHERE campaign_id IS NULL
)
INSERT INTO campaigns (user_id, name, description, status, start_date)
SELECT 
  user_id, 
  'Legacy Campaign', 
  'Auto-generated for existing widgets', 
  'active',
  NOW()
FROM orphaned_widgets;

-- Step 2: Link orphaned widgets to their legacy campaigns
UPDATE widgets w
SET campaign_id = c.id
FROM campaigns c
WHERE w.campaign_id IS NULL 
  AND w.user_id = c.user_id 
  AND c.name = 'Legacy Campaign'
  AND c.description = 'Auto-generated for existing widgets';

-- Step 3: Make campaign_id required
ALTER TABLE widgets ALTER COLUMN campaign_id SET NOT NULL;

-- Phase 5: Add new integration types to enum
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'ga4';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'rss';
ALTER TYPE integration_type ADD VALUE IF NOT EXISTS 'hubspot';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_widgets_campaign_id ON widgets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_dates ON campaigns(status, start_date, end_date);