-- Insert Free plan into subscription_plans table
INSERT INTO subscription_plans (
  name,
  price_monthly,
  price_yearly,
  max_websites,
  max_events_per_month,
  storage_limit_bytes,
  video_max_duration_seconds,
  testimonial_limit,
  form_limit,
  analytics_level,
  has_white_label,
  has_api,
  is_active
)
SELECT 
  'Free',
  0,
  0,
  1,
  1000,
  104857600, -- 100MB in bytes
  60, -- 60 seconds
  10,
  1,
  'basic',
  false,
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_plans WHERE name = 'Free'
);