-- Add 'webhook' and 'zapier' integration types to integrations_config if not exists
-- Insert default configuration for webhook and zapier integrations

INSERT INTO integrations_config (integration_type, config, is_active)
VALUES 
  ('webhook', '{
    "enabled_globally": true,
    "rate_limit_per_user": 1000,
    "quota_per_plan": {
      "free": 1,
      "pro": 5,
      "business": 20
    },
    "webhook_signing_secret": ""
  }'::jsonb, true),
  ('zapier', '{
    "enabled_globally": true,
    "rate_limit_per_user": 1000,
    "quota_per_plan": {
      "free": 1,
      "pro": 5,
      "business": 20
    }
  }'::jsonb, true)
ON CONFLICT (integration_type) DO UPDATE
SET 
  config = EXCLUDED.config,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();