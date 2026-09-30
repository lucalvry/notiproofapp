-- Phase A: Database Foundation - Create Missing Tables

-- =============================================================================
-- 1. INTEGRATIONS_CONFIG TABLE
-- Stores encrypted integration credentials (Shopify, Stripe, WooCommerce, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.integrations_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(integration_type)
);

-- Enable RLS
ALTER TABLE public.integrations_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only superadmins can manage
CREATE POLICY "Superadmins can manage all integration configs"
  ON public.integrations_config
  FOR ALL
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_integrations_config_updated_at
  BEFORE UPDATE ON public.integrations_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. INTEGRATION_LOGS TABLE
-- Tracks integration actions, webhook events, and API calls
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending', 'warning')),
  details JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT,
  request_data JSONB,
  response_data JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_integration_logs_type ON public.integration_logs(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON public.integration_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON public.integration_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_user_id ON public.integration_logs(user_id);

-- Enable RLS
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can view all, system can insert
CREATE POLICY "Admins can view all integration logs"
  ON public.integration_logs
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "System can insert integration logs"
  ON public.integration_logs
  FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- 3. SYSTEM_SETTINGS TABLE
-- Global feature flags, site banners, branding, configuration
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster key lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Superadmins only
CREATE POLICY "Superadmins can manage all system settings"
  ON public.system_settings
  FOR ALL
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. SEED INITIAL SYSTEM SETTINGS
-- =============================================================================
INSERT INTO public.system_settings (key, value, category, description) VALUES
  ('maintenance_mode', '{"enabled": false, "message": "We are currently performing maintenance. Please check back soon."}'::jsonb, 'system', 'Controls site-wide maintenance mode'),
  ('feature_flags', '{"ai_insights": true, "heatmaps": true, "ab_testing": true, "social_proof": true}'::jsonb, 'features', 'Feature availability toggles'),
  ('site_banner', '{"enabled": false, "message": "", "type": "info", "dismissible": true}'::jsonb, 'ui', 'Global site banner configuration'),
  ('branding', '{"app_name": "NotiProof", "support_email": "support@notiproof.com", "logo_url": ""}'::jsonb, 'branding', 'Application branding settings'),
  ('limits', '{"max_widgets_per_user": 10, "max_events_per_widget": 10000, "max_api_calls_per_day": 100000}'::jsonb, 'limits', 'System-wide usage limits')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 5. HELPER FUNCTION: Log Integration Action
-- =============================================================================
CREATE OR REPLACE FUNCTION public.log_integration_action(
  _integration_type TEXT,
  _action TEXT,
  _status TEXT,
  _details JSONB DEFAULT '{}'::jsonb,
  _user_id UUID DEFAULT NULL,
  _error_message TEXT DEFAULT NULL,
  _duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.integration_logs (
    integration_type,
    action,
    status,
    details,
    user_id,
    error_message,
    duration_ms
  ) VALUES (
    _integration_type,
    _action,
    _status,
    _details,
    COALESCE(_user_id, auth.uid()),
    _error_message,
    _duration_ms
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;