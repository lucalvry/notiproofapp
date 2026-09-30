-- Fix subscription_plans RLS policy to include superadmin
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;

CREATE POLICY "Admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Seed missing integration configs
INSERT INTO integrations_config (integration_type, is_active, config) 
VALUES
  ('shopify', false, '{"enabled_globally": true}'::jsonb),
  ('woocommerce', false, '{"enabled_globally": true}'::jsonb),
  ('stripe', false, '{"enabled_globally": true}'::jsonb),
  ('ga4', false, '{"enabled_globally": true, "cache_duration_seconds": 15}'::jsonb),
  ('google_reviews', false, '{"enabled_globally": true}'::jsonb)
ON CONFLICT (integration_type) DO NOTHING;