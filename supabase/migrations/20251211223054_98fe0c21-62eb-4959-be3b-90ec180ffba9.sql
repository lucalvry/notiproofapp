-- Phase 1: Critical Security Fixes (with proper cleanup)

-- ============================================
-- 1. FIX TEMPLATES TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Everyone can view active event templates" ON public.templates;
DROP POLICY IF EXISTS "Authenticated users can view active templates" ON public.templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON public.templates;

CREATE POLICY "Authenticated users can view active templates"
ON public.templates
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage templates"
ON public.templates
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- 2. FIX SUBSCRIPTION_PLANS TABLE RLS
-- ============================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Authenticated users can view active plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;

-- Create a view for public plan info (without Stripe IDs)
CREATE OR REPLACE VIEW public.subscription_plans_public AS
SELECT 
  id, name, price_monthly, price_yearly, max_events_per_month, 
  max_websites, features, is_active, trial_period_days,
  can_remove_branding, has_api, has_white_label, analytics_level,
  storage_limit_bytes, testimonial_limit, form_limit, video_max_duration_seconds
FROM public.subscription_plans
WHERE is_active = true;

GRANT SELECT ON public.subscription_plans_public TO anon, authenticated;

CREATE POLICY "Authenticated users can view active plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- 3. FIX TESTIMONIAL_FORMS TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Users can manage their own forms" ON public.testimonial_forms;
DROP POLICY IF EXISTS "Public can view active forms" ON public.testimonial_forms;
DROP POLICY IF EXISTS "Users can manage forms for their websites" ON public.testimonial_forms;
DROP POLICY IF EXISTS "Public can view active forms by slug" ON public.testimonial_forms;

CREATE POLICY "Users can manage forms for their websites"
ON public.testimonial_forms
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.websites w
    WHERE w.id = testimonial_forms.website_id
    AND w.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.websites w
    WHERE w.id = testimonial_forms.website_id
    AND w.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view active forms by slug"
ON public.testimonial_forms
FOR SELECT
TO anon
USING (is_active = true);

-- ============================================
-- 4. FIX QUICK_WIN_TEMPLATES TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Everyone can view active event templates" ON public.quick_win_templates;
DROP POLICY IF EXISTS "Authenticated users can view active quick win templates" ON public.quick_win_templates;
DROP POLICY IF EXISTS "Admins can manage quick win templates" ON public.quick_win_templates;

CREATE POLICY "Authenticated users can view active quick win templates"
ON public.quick_win_templates
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage quick win templates"
ON public.quick_win_templates
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- 5. FIX TESTIMONIAL_EMAIL_TEMPLATES TABLE RLS
-- ============================================
ALTER TABLE public.testimonial_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their email templates" ON public.testimonial_email_templates;
DROP POLICY IF EXISTS "Users can manage their own email templates" ON public.testimonial_email_templates;

CREATE POLICY "Users can manage their own email templates"
ON public.testimonial_email_templates
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. FIX EVENT_TEMPLATES TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Everyone can view active event templates" ON public.event_templates;
DROP POLICY IF EXISTS "Authenticated users can view active event templates" ON public.event_templates;
DROP POLICY IF EXISTS "Admins can manage event templates" ON public.event_templates;

CREATE POLICY "Authenticated users can view active event templates"
ON public.event_templates
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage event templates"
ON public.event_templates
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- 7. FIX HELP_ARTICLE_VIEWS - Remove IP logging
-- ============================================
ALTER TABLE public.help_article_views 
ALTER COLUMN ip_address DROP NOT NULL;

ALTER TABLE public.help_article_views 
ALTER COLUMN ip_address SET DEFAULT NULL;

DROP POLICY IF EXISTS "Anyone can create article views" ON public.help_article_views;
DROP POLICY IF EXISTS "Users can view their own article views" ON public.help_article_views;
DROP POLICY IF EXISTS "Anyone can record article views" ON public.help_article_views;
DROP POLICY IF EXISTS "Only admins can view article analytics" ON public.help_article_views;

CREATE POLICY "Anyone can record article views"
ON public.help_article_views
FOR INSERT
TO anon, authenticated
WITH CHECK (ip_address IS NULL);

CREATE POLICY "Only admins can view article analytics"
ON public.help_article_views
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- ============================================
-- 8. FIX DATABASE FUNCTIONS - Add search_path
-- ============================================

CREATE OR REPLACE FUNCTION public.update_feature_flags_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_download_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.marketplace_templates 
  SET download_count = download_count + 1
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_template_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.marketplace_templates 
  SET 
    rating_average = (
      SELECT AVG(rating)::DECIMAL(3,2) 
      FROM public.template_ratings 
      WHERE template_id = NEW.template_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.template_ratings 
      WHERE template_id = NEW.template_id
    )
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.email_preferences (user_id, weekly_reports, marketing_emails, security_alerts)
  VALUES (NEW.id, true, true, true)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_default_permissions_for_role(_role team_role)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  RETURN CASE _role
    WHEN 'owner' THEN jsonb_build_object(
      'campaigns', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'widgets', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'analytics', jsonb_build_object('view', true, 'export', true),
      'integrations', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'team', jsonb_build_object('invite', true, 'remove', true, 'edit_roles', true, 'view', true),
      'billing', jsonb_build_object('view', true, 'manage', true)
    )
    WHEN 'admin' THEN jsonb_build_object(
      'campaigns', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'widgets', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'analytics', jsonb_build_object('view', true, 'export', true),
      'integrations', jsonb_build_object('create', true, 'edit', true, 'delete', true, 'view', true),
      'team', jsonb_build_object('invite', true, 'remove', true, 'edit_roles', false, 'view', true),
      'billing', jsonb_build_object('view', true, 'manage', false)
    )
    WHEN 'editor' THEN jsonb_build_object(
      'campaigns', jsonb_build_object('create', true, 'edit', true, 'delete', false, 'view', true),
      'widgets', jsonb_build_object('create', true, 'edit', true, 'delete', false, 'view', true),
      'analytics', jsonb_build_object('view', true, 'export', false),
      'integrations', jsonb_build_object('create', false, 'edit', true, 'delete', false, 'view', true),
      'team', jsonb_build_object('invite', false, 'remove', false, 'edit_roles', false, 'view', true),
      'billing', jsonb_build_object('view', false, 'manage', false)
    )
    WHEN 'viewer' THEN jsonb_build_object(
      'campaigns', jsonb_build_object('create', false, 'edit', false, 'delete', false, 'view', true),
      'widgets', jsonb_build_object('create', false, 'edit', false, 'delete', false, 'view', true),
      'analytics', jsonb_build_object('view', true, 'export', false),
      'integrations', jsonb_build_object('create', false, 'edit', false, 'delete', false, 'view', true),
      'team', jsonb_build_object('invite', false, 'remove', false, 'edit_roles', false, 'view', true),
      'billing', jsonb_build_object('view', false, 'manage', false)
    )
    ELSE jsonb_build_object(
      'campaigns', jsonb_build_object('create', true, 'edit', true, 'delete', false, 'view', true),
      'widgets', jsonb_build_object('create', true, 'edit', true, 'delete', false, 'view', true),
      'analytics', jsonb_build_object('view', true, 'export', false),
      'integrations', jsonb_build_object('create', false, 'edit', false, 'delete', false, 'view', true),
      'team', jsonb_build_object('invite', false, 'remove', false, 'edit_roles', false, 'view', true),
      'billing', jsonb_build_object('view', false, 'manage', false)
    )
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_campaigns_due_for_polling()
RETURNS TABLE(campaign_id uuid, user_id uuid, website_id uuid, polling_config jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.user_id,
    c.website_id,
    c.polling_config
  FROM campaigns c
  WHERE c.status = 'active'
    AND EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(c.data_sources) AS source
      WHERE source->>'provider' = 'ga4'
    )
    AND (c.polling_config->>'enabled')::boolean = true
    AND (
      (c.polling_config->>'last_poll_at') IS NULL
      OR (c.polling_config->>'last_poll_at')::timestamp with time zone + 
         (COALESCE((c.polling_config->>'interval_minutes')::integer, 5) || ' minutes')::interval < NOW()
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = email_to_check
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_website(
  _website_id uuid, 
  _verification_type text, 
  _verification_data jsonb DEFAULT '{}'::jsonb, 
  _ip_address text DEFAULT NULL::text, 
  _user_agent text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  website_exists BOOLEAN := FALSE;
  verification_id UUID;
BEGIN
  SELECT true INTO website_exists 
  FROM websites 
  WHERE id = _website_id;
  
  IF NOT website_exists THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO website_verifications (
    website_id, 
    verification_type, 
    verification_data, 
    is_successful, 
    verified_at, 
    ip_address, 
    user_agent
  ) VALUES (
    _website_id, 
    _verification_type, 
    _verification_data, 
    TRUE, 
    NOW(), 
    _ip_address, 
    _user_agent
  ) RETURNING id INTO verification_id;
  
  UPDATE websites 
  SET 
    is_verified = TRUE,
    last_verification_at = NOW(),
    verification_attempts = verification_attempts + 1,
    updated_at = NOW()
  WHERE id = _website_id;
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_website_by_domain(_domain text)
RETURNS TABLE(id uuid, user_id uuid, name text, domain text, is_verified boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT w.id, w.user_id, w.name, w.domain, w.is_verified
  FROM websites w
  WHERE w.domain = _domain 
    OR w.domain = replace(_domain, 'www.', '') 
    OR ('www.' || w.domain) = _domain
  LIMIT 1;
$function$;