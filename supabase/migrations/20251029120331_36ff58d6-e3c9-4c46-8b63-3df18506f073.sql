-- Add connector architecture fields to integrations_config
ALTER TABLE integrations_config 
ADD COLUMN IF NOT EXISTS connector_type TEXT DEFAULT 'webhook',
ADD COLUMN IF NOT EXISTS polling_interval_minutes INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS requires_oauth BOOLEAN DEFAULT false;

-- Insert Phase 1 critical integrations
INSERT INTO integrations_config (integration_type, is_active, config, connector_type, requires_oauth) VALUES
('wordpress', true, '{"quota_per_plan": {"free": 1, "starter": 3, "pro": 10, "enterprise": -1}, "webhook_events": ["form_submission", "comment", "user_registration"]}', 'webhook', false),
('webflow', true, '{"quota_per_plan": {"free": 1, "starter": 3, "pro": 10, "enterprise": -1}, "webhook_events": ["form_submission", "ecommerce_order"]}', 'webhook', false),
('paypal', true, '{"quota_per_plan": {"free": 1, "starter": 3, "pro": 10, "enterprise": -1}, "webhook_events": ["payment_sale_completed", "payment_sale_refunded", "recurring_payment_created"]}', 'webhook', false),
('teachable', true, '{"quota_per_plan": {"free": 1, "starter": 3, "pro": 10, "enterprise": -1}, "webhook_events": ["user_enrolled", "course_completed"]}', 'webhook', false),
('jotform', true, '{"quota_per_plan": {"free": 1, "starter": 3, "pro": 10, "enterprise": -1}, "webhook_events": ["form_submission"]}', 'webhook', false),
('squarespace', true, '{"quota_per_plan": {"free": 1, "starter": 3, "pro": 10, "enterprise": -1}, "webhook_events": ["order_create", "form_submission", "appointment_created"]}', 'webhook', false)
ON CONFLICT (integration_type) DO UPDATE SET
  connector_type = EXCLUDED.connector_type,
  requires_oauth = EXCLUDED.requires_oauth,
  config = EXCLUDED.config;

-- Insert Phase 2 integrations
INSERT INTO integrations_config (integration_type, is_active, config, connector_type, requires_oauth) VALUES
('segment', true, '{"quota_per_plan": {"free": 0, "starter": 1, "pro": 5, "enterprise": -1}}', 'webhook', false),
('intercom', true, '{"quota_per_plan": {"free": 0, "starter": 1, "pro": 3, "enterprise": -1}}', 'oauth', true),
('ghost', true, '{"quota_per_plan": {"free": 1, "starter": 3, "pro": 10, "enterprise": -1}}', 'webhook', false),
('gumroad', true, '{"quota_per_plan": {"free": 1, "starter": 3, "pro": 10, "enterprise": -1}}', 'webhook', false),
('mailchimp', true, '{"quota_per_plan": {"free": 0, "starter": 1, "pro": 3, "enterprise": -1}}', 'oauth', true),
('spotify', true, '{"quota_per_plan": {"free": 0, "starter": 1, "pro": 3, "enterprise": -1}}', 'oauth', true),
('thinkific', true, '{"quota_per_plan": {"free": 1, "starter": 3, "pro": 10, "enterprise": -1}}', 'webhook', false),
('plaid', true, '{"quota_per_plan": {"free": 0, "starter": 1, "pro": 3, "enterprise": -1}}', 'webhook', false)
ON CONFLICT (integration_type) DO UPDATE SET
  connector_type = EXCLUDED.connector_type,
  requires_oauth = EXCLUDED.requires_oauth,
  config = EXCLUDED.config;

-- Update existing integrations with connector types
UPDATE integrations_config SET connector_type = 'webhook', requires_oauth = false WHERE integration_type IN ('webhook', 'typeform', 'calendly', 'shopify', 'woocommerce', 'stripe');
UPDATE integrations_config SET connector_type = 'zapier_proxy', requires_oauth = false WHERE integration_type = 'zapier';
UPDATE integrations_config SET connector_type = 'api_poll', requires_oauth = true, polling_interval_minutes = 60 WHERE integration_type IN ('google_reviews', 'instagram', 'twitter');
UPDATE integrations_config SET connector_type = 'oauth', requires_oauth = true WHERE integration_type = 'ga4';
UPDATE integrations_config SET connector_type = 'api_poll', requires_oauth = false, polling_interval_minutes = 60 WHERE integration_type = 'rss';
UPDATE integrations_config SET connector_type = 'oauth', requires_oauth = true WHERE integration_type = 'hubspot';