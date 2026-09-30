-- Phase 1: Add missing integrations to integrations_config table
-- This ensures all 38 integrations defined in integrationMetadata.ts exist in the database

-- Phase 1 Missing Integrations (4)
INSERT INTO integrations_config (integration_type, is_active, requires_oauth, connector_type, config, polling_interval_minutes)
VALUES
  ('hubspot', true, true, 'oauth', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 0, 'starter', 1, 'pro', 3, 'business', 10, 'enterprise', -1),
    'rate_limit_per_user', 240
  ), null),
  
  ('instagram', true, true, 'api_poll', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 1, 'starter', 3, 'pro', 5, 'business', 10, 'enterprise', -1),
    'rate_limit_per_user', 200
  ), 60),
  
  ('twitter', true, true, 'api_poll', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 1, 'starter', 3, 'pro', 5, 'business', 10, 'enterprise', -1),
    'rate_limit_per_user', 200
  ), 30),
  
  ('rss', true, false, 'api_poll', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 3, 'starter', 10, 'pro', 25, 'business', 50, 'enterprise', -1),
    'rate_limit_per_user', 100
  ), 120)

ON CONFLICT (integration_type) DO NOTHING;

-- Phase 3 Missing Integrations (11)
INSERT INTO integrations_config (integration_type, is_active, requires_oauth, connector_type, config, polling_interval_minutes)
VALUES
  ('razorpay', true, false, 'webhook', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 1, 'starter', 3, 'pro', 10, 'business', 20, 'enterprise', -1),
    'webhook_events', jsonb_build_array('payment_authorized', 'payment_captured', 'subscription_created')
  ), null),
  
  ('flutterwave', true, false, 'webhook', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 1, 'starter', 3, 'pro', 10, 'business', 20, 'enterprise', -1),
    'webhook_events', jsonb_build_array('charge_completed', 'transfer_completed')
  ), null),
  
  ('salesforce', true, true, 'oauth', jsonb_build_object(
    'enabled_globally', false,
    'quota_per_plan', jsonb_build_object('free', 0, 'starter', 0, 'pro', 0, 'business', 1, 'enterprise', -1),
    'rate_limit_per_user', 100
  ), null),
  
  ('mixpanel', true, false, 'webhook', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 0, 'starter', 1, 'pro', 5, 'business', 10, 'enterprise', -1),
    'webhook_events', jsonb_build_array('track', 'engage')
  ), null),
  
  ('circle', true, false, 'webhook', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 0, 'starter', 1, 'pro', 3, 'business', 10, 'enterprise', -1),
    'webhook_events', jsonb_build_array('member_joined', 'post_created', 'comment_created')
  ), null),
  
  ('learndash', true, false, 'webhook', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 1, 'starter', 3, 'pro', 10, 'business', 20, 'enterprise', -1),
    'webhook_events', jsonb_build_array('course_enrolled', 'course_completed', 'lesson_completed')
  ), null),
  
  ('soundcloud', true, true, 'api_poll', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 0, 'starter', 1, 'pro', 3, 'business', 10, 'enterprise', -1),
    'rate_limit_per_user', 100
  ), 60),
  
  ('substack', true, false, 'api_poll', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 1, 'starter', 3, 'pro', 10, 'business', 20, 'enterprise', -1),
    'rate_limit_per_user', 100
  ), 120),
  
  ('beehiiv', true, false, 'webhook', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 1, 'starter', 3, 'pro', 10, 'business', 20, 'enterprise', -1),
    'webhook_events', jsonb_build_array('subscriber_created', 'post_published')
  ), null),
  
  ('convertkit', true, false, 'webhook', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 1, 'starter', 3, 'pro', 10, 'business', 20, 'enterprise', -1),
    'webhook_events', jsonb_build_array('subscriber_activate', 'subscriber_unsubscribe', 'purchase_create')
  ), null),
  
  ('framer', true, false, 'webhook', jsonb_build_object(
    'enabled_globally', true,
    'quota_per_plan', jsonb_build_object('free', 1, 'starter', 5, 'pro', 15, 'business', 30, 'enterprise', -1),
    'webhook_events', jsonb_build_array('form_submission')
  ), null)

ON CONFLICT (integration_type) DO NOTHING;