-- Phase 1 Native Integrations: Add native_config column to campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS native_config JSONB DEFAULT '{}'::jsonb;

-- Add index for native config queries
CREATE INDEX IF NOT EXISTS idx_campaigns_native_config 
ON campaigns USING gin (native_config);

-- Add comment
COMMENT ON COLUMN campaigns.native_config IS 
'Stores configuration for native integrations (Instant Capture, Active Visitors, Smart Announcements)';