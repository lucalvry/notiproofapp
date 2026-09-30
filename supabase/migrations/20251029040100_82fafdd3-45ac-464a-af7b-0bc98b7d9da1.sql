-- Seed integrations_config table with Typeform and Calendly configurations

-- Insert Typeform integration config
INSERT INTO integrations_config (integration_type, config, is_active)
VALUES (
  'typeform',
  '{
    "enabled_globally": true,
    "rate_limit_per_user": 1000,
    "quota_per_plan": {
      "free": 1,
      "pro": 5,
      "business": 20
    },
    "description": "Capture form submissions and display them as social proof notifications",
    "webhook_signing": false
  }'::jsonb,
  true
)
ON CONFLICT (integration_type) DO UPDATE SET
  config = EXCLUDED.config,
  is_active = EXCLUDED.is_active;

-- Insert Calendly integration config
INSERT INTO integrations_config (integration_type, config, is_active)
VALUES (
  'calendly',
  '{
    "enabled_globally": true,
    "rate_limit_per_user": 1000,
    "quota_per_plan": {
      "free": 1,
      "pro": 5,
      "business": 20
    },
    "description": "Show notifications when meetings are scheduled or canceled",
    "webhook_signing": true
  }'::jsonb,
  true
)
ON CONFLICT (integration_type) DO UPDATE SET
  config = EXCLUDED.config,
  is_active = EXCLUDED.is_active;