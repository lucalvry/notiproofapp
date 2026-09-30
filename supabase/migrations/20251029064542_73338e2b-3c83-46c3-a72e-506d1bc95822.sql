-- Seed missing integration configs for all integrations
INSERT INTO integrations_config (integration_type, is_active, config) VALUES
  ('shopify', false, '{"enabled_globally": true, "quota_per_plan": {"free": 1, "pro": 5, "business": 20}}'::jsonb),
  ('woocommerce', false, '{"enabled_globally": true, "quota_per_plan": {"free": 1, "pro": 5, "business": 20}}'::jsonb),
  ('stripe', false, '{"enabled_globally": true, "quota_per_plan": {"free": 1, "pro": 5, "business": 20}}'::jsonb),
  ('ga4', false, '{"enabled_globally": true, "cache_duration_seconds": 15, "quota_per_plan": {"free": 1, "pro": 5, "business": 20}}'::jsonb),
  ('google_reviews', false, '{"enabled_globally": true, "quota_per_plan": {"free": 1, "pro": 5, "business": 20}}'::jsonb)
ON CONFLICT (integration_type) DO NOTHING;