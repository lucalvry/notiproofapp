-- =========================================================================
-- PHASE 1: SNAP BACK TO SPEC v2
-- Destructive reset to match NotiProof_PreBuild_Spec_v2 exactly
-- =========================================================================

-- ---- 1. DROP all non-spec tables (CASCADE removes dependent objects) ----
DROP TABLE IF EXISTS public.ab_test_variants CASCADE;
DROP TABLE IF EXISTS public.ab_tests CASCADE;
DROP TABLE IF EXISTS public.admin_email_templates CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.analytics_insights CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.campaign_playlists CASCADE;
DROP TABLE IF EXISTS public.campaign_revenue_stats CASCADE;
DROP TABLE IF EXISTS public.campaign_stats CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.email_preferences CASCADE;
DROP TABLE IF EXISTS public.email_send_log CASCADE;
DROP TABLE IF EXISTS public.event_templates CASCADE;
DROP TABLE IF EXISTS public.event_usage_tracking CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.feature_flags CASCADE;
DROP TABLE IF EXISTS public.ga_integration_config CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.heatmap_clicks CASCADE;
DROP TABLE IF EXISTS public.help_article_categories CASCADE;
DROP TABLE IF EXISTS public.help_article_feedback CASCADE;
DROP TABLE IF EXISTS public.help_article_views CASCADE;
DROP TABLE IF EXISTS public.help_articles CASCADE;
DROP TABLE IF EXISTS public.help_categories CASCADE;
DROP TABLE IF EXISTS public.impact_conversions CASCADE;
DROP TABLE IF EXISTS public.impact_goals CASCADE;
DROP TABLE IF EXISTS public.integration_connectors CASCADE;
DROP TABLE IF EXISTS public.integration_hooks CASCADE;
DROP TABLE IF EXISTS public.integration_logs CASCADE;
DROP TABLE IF EXISTS public.integrations CASCADE;
DROP TABLE IF EXISTS public.integrations_config CASCADE;
DROP TABLE IF EXISTS public.marketplace_templates CASCADE;
DROP TABLE IF EXISTS public.media CASCADE;
DROP TABLE IF EXISTS public.migration_log CASCADE;
DROP TABLE IF EXISTS public.notification_conversions CASCADE;
DROP TABLE IF EXISTS public.notification_weights CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.quick_win_templates CASCADE;
DROP TABLE IF EXISTS public.social_connectors CASCADE;
DROP TABLE IF EXISTS public.social_items CASCADE;
DROP TABLE IF EXISTS public.subscription_addons CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
DROP TABLE IF EXISTS public.template_categories CASCADE;
DROP TABLE IF EXISTS public.template_downloads CASCADE;
DROP TABLE IF EXISTS public.template_ratings CASCADE;
DROP TABLE IF EXISTS public.template_tags CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.testimonial_collection_forms CASCADE;
DROP TABLE IF EXISTS public.testimonial_email_templates CASCADE;
DROP TABLE IF EXISTS public.testimonial_embeds CASCADE;
DROP TABLE IF EXISTS public.testimonial_form_questions CASCADE;
DROP TABLE IF EXISTS public.testimonial_forms CASCADE;
DROP TABLE IF EXISTS public.testimonial_invites CASCADE;
DROP TABLE IF EXISTS public.testimonials CASCADE;
DROP TABLE IF EXISTS public.tracking_pixels CASCADE;
DROP TABLE IF EXISTS public.team_invitations CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.trial_email_notifications CASCADE;
DROP TABLE IF EXISTS public.user_quick_wins CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.user_trial_history CASCADE;
DROP TABLE IF EXISTS public.visitor_journeys CASCADE;
DROP TABLE IF EXISTS public.visitor_sessions CASCADE;
DROP TABLE IF EXISTS public.webhook_dedup CASCADE;
DROP TABLE IF EXISTS public.website_settings CASCADE;
DROP TABLE IF EXISTS public.website_verifications CASCADE;
DROP TABLE IF EXISTS public.websites CASCADE;
DROP TABLE IF EXISTS public.widget_impressions CASCADE;
DROP TABLE IF EXISTS public.widget_templates CASCADE;
DROP TABLE IF EXISTS public.widget_variants CASCADE;
DROP TABLE IF EXISTS public.widgets CASCADE;
DROP TABLE IF EXISTS public.winback_email_campaigns CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;

-- ---- 2. DROP non-spec functions ----
DROP FUNCTION IF EXISTS public.clear_manual_events(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.clear_demo_events(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_all_template_events(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_demo_events() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_webhook_dedup() CASCADE;
DROP FUNCTION IF EXISTS public.update_feature_flags_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_team_memberships(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_team_permission(uuid, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_website_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.increment_download_count() CASCADE;
DROP FUNCTION IF EXISTS public.update_template_rating() CASCADE;
DROP FUNCTION IF EXISTS public.update_ab_test_metrics() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_ab_test_confidence(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.auto_declare_ab_test_winner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_integration_count(uuid, text[]) CASCADE;
DROP FUNCTION IF EXISTS public.get_db_stats() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_role_self_modification() CASCADE;
DROP FUNCTION IF EXISTS public.increment_form_views(text) CASCADE;
DROP FUNCTION IF EXISTS public.increment_form_views(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.increment_campaign_view(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.increment_campaign_click(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_admin_email_templates_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_testimonial_forms_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.set_default_team_permissions() CASCADE;
DROP FUNCTION IF EXISTS public.verify_invitation_token(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.purge_deleted_media(uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.mark_website_media_for_deletion(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_website_media(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_website_deletion_impact(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_website_media_impact(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_preferences() CASCADE;
DROP FUNCTION IF EXISTS public.increment_event_usage(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.increment_article_view_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_article_helpful_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_primary_website(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.generate_demo_events(uuid, business_type) CASCADE;
DROP FUNCTION IF EXISTS public.log_integration_action(text, text, text, jsonb, uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.submit_public_testimonial(uuid, uuid, text, text, text, integer, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.check_event_quota(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.purge_old_deleted_websites() CASCADE;
DROP FUNCTION IF EXISTS public.increment_event_counter(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_event_usage(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_active_visitor_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_active_visitor_count_for_site(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_onboarding_progress(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_onboarding_milestone(uuid, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.get_default_permissions_for_role(team_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_campaigns_due_for_polling() CASCADE;
DROP FUNCTION IF EXISTS public.check_email_exists(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_media_pending_cleanup(integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_orphaned_media() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_storage_used(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.soft_delete_website(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.restore_website(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.record_conversion(text, text, uuid, text, numeric, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.convert_to_organization(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.initialize_notification_weights(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.log_admin_action(text, text, uuid, jsonb, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.log_role_change() CASCADE;

-- ---- 3. DROP enums no longer needed ----
DROP TYPE IF EXISTS public.business_type CASCADE;
DROP TYPE IF EXISTS public.integration_type CASCADE;
DROP TYPE IF EXISTS public.event_status CASCADE;
DROP TYPE IF EXISTS public.event_source CASCADE;
DROP TYPE IF EXISTS public.moderation_status CASCADE;
DROP TYPE IF EXISTS public.team_role CASCADE;

-- ---- 4. CREATE spec enums ----
CREATE TYPE public.user_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE public.integration_platform AS ENUM (
  'stripe', 'shopify', 'woocommerce', 'paypal',
  'google_reviews', 'trustpilot', 'g2', 'capterra',
  'mailchimp', 'klaviyo', 'hubspot', 'webhook'
);
CREATE TYPE public.verification_tier AS ENUM ('verified', 'pending', 'unverified');
CREATE TYPE public.proof_source_type AS ENUM (
  'purchase', 'signup', 'review', 'testimonial', 'social_post', 'manual'
);
CREATE TYPE public.testimonial_request_status AS ENUM (
  'pending', 'sent', 'opened', 'completed', 'expired'
);
CREATE TYPE public.integration_status AS ENUM ('connected', 'disconnected', 'error', 'pending');
CREATE TYPE public.widget_type AS ENUM ('floating', 'inline', 'badge');
CREATE TYPE public.widget_status AS ENUM ('draft', 'active', 'paused');
CREATE TYPE public.widget_event_type AS ENUM ('impression', 'interaction', 'conversion');
CREATE TYPE public.business_plan AS ENUM ('free', 'starter', 'growth', 'scale');

-- ---- 5. CORE: businesses ----
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  industry TEXT,
  brand_color TEXT DEFAULT '#2563eb',
  time_zone TEXT DEFAULT 'UTC',
  plan public.business_plan NOT NULL DEFAULT 'free',
  install_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- 6. CORE: users (mirror of auth.users for app data) ----
CREATE TABLE public.users (
  id UUID PRIMARY KEY,  -- = auth.users.id
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'owner',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_business ON public.users(business_id);
CREATE INDEX idx_users_email ON public.users(email);

-- ---- 7. CORE: business_users (multi-membership join) ----
CREATE TABLE public.business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
CREATE INDEX idx_business_users_business ON public.business_users(business_id);
CREATE INDEX idx_business_users_user ON public.business_users(user_id);

-- ---- 8. CORE: proof_objects ----
CREATE TABLE public.proof_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source_type public.proof_source_type NOT NULL,
  source_ref TEXT, -- external id (e.g. stripe charge id)
  content TEXT NOT NULL,
  author_name TEXT,
  author_location TEXT,
  author_avatar_url TEXT,
  media_url TEXT, -- video/image
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  verification_tier public.verification_tier NOT NULL DEFAULT 'pending',
  sentiment_score NUMERIC(4,3), -- -1.000 .. 1.000
  ai_claims JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_proof_business ON public.proof_objects(business_id);
CREATE INDEX idx_proof_approved ON public.proof_objects(business_id, is_approved);
CREATE INDEX idx_proof_tier ON public.proof_objects(verification_tier);

-- ---- 9. CORE: testimonial_requests ----
CREATE TABLE public.testimonial_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  collection_token TEXT NOT NULL UNIQUE,
  status public.testimonial_request_status NOT NULL DEFAULT 'pending',
  proof_object_id UUID REFERENCES public.proof_objects(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_treq_business ON public.testimonial_requests(business_id);
CREATE INDEX idx_treq_token ON public.testimonial_requests(collection_token);

-- ---- 10. CORE: integrations ----
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  platform public.integration_platform NOT NULL,
  display_name TEXT,
  access_token TEXT,    -- encrypted at rest by Supabase
  refresh_token TEXT,
  webhook_id TEXT,
  webhook_secret TEXT,
  auto_request_enabled BOOLEAN NOT NULL DEFAULT false,
  status public.integration_status NOT NULL DEFAULT 'pending',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_integrations_business ON public.integrations(business_id);
CREATE INDEX idx_integrations_platform ON public.integrations(platform);

-- ---- 11. CORE: integration_events ----
CREATE TABLE public.integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_int_events_integration ON public.integration_events(integration_id);
CREATE INDEX idx_int_events_unprocessed ON public.integration_events(processed) WHERE processed = false;

-- ---- 12. CORE: widgets ----
CREATE TABLE public.widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  widget_type public.widget_type NOT NULL DEFAULT 'floating',
  variant TEXT,                  -- e.g. "A", "B"
  ab_test_group_id UUID,         -- nullable label per spec
  config JSONB NOT NULL DEFAULT '{}'::jsonb, -- holds design settings, display rules, proof source
  status public.widget_status NOT NULL DEFAULT 'draft',
  impressions_total BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_widgets_business ON public.widgets(business_id);
CREATE INDEX idx_widgets_status ON public.widgets(status);

-- ---- 13. CORE: widget_events ----
CREATE TABLE public.widget_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  proof_object_id UUID REFERENCES public.proof_objects(id) ON DELETE SET NULL,
  event_type public.widget_event_type NOT NULL,
  page_url TEXT,
  visitor_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_we_widget ON public.widget_events(widget_id, occurred_at DESC);
CREATE INDEX idx_we_business ON public.widget_events(business_id, occurred_at DESC);
CREATE INDEX idx_we_type ON public.widget_events(event_type);

-- =========================================================================
-- HELPERS
-- =========================================================================

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_proof_updated BEFORE UPDATE ON public.proof_objects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_integrations_updated BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_widgets_updated BEFORE UPDATE ON public.widgets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Sync user_roles.is_admin -> users.is_admin (keep user_roles as source of truth for gating)
CREATE OR REPLACE FUNCTION public.sync_admin_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.role IN ('admin', 'superadmin') THEN
    UPDATE public.users SET is_admin = true WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' AND OLD.role IN ('admin', 'superadmin') THEN
    -- only clear if no other admin role remains
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = OLD.user_id AND role IN ('admin', 'superadmin')
    ) THEN
      UPDATE public.users SET is_admin = false WHERE id = OLD.user_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_admin_flag
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_flag();

-- Auth signup hook: create users row + a default business
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_business_id UUID;
  full_name_val TEXT;
BEGIN
  full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- create a business for the new owner
  INSERT INTO public.businesses (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'business_name', full_name_val || '''s Business'))
  RETURNING id INTO new_business_id;

  -- create user record
  INSERT INTO public.users (id, business_id, full_name, email, role, is_admin)
  VALUES (NEW.id, new_business_id, full_name_val, NEW.email, 'owner', false);

  -- membership
  INSERT INTO public.business_users (business_id, user_id, role)
  VALUES (new_business_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Membership helper for RLS (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.user_in_business(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE user_id = _user_id AND business_id = _business_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_business_role(_user_id uuid, _business_id uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.business_users
  WHERE user_id = _user_id AND business_id = _business_id
  LIMIT 1;
$$;

-- Spec RPC: analytics
CREATE OR REPLACE FUNCTION public.get_widget_analytics(
  _business_id uuid,
  _start timestamptz,
  _end timestamptz
)
RETURNS TABLE (
  bucket date,
  impressions bigint,
  interactions bigint,
  conversions bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date_trunc('day', occurred_at)::date AS bucket,
    COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
    COUNT(*) FILTER (WHERE event_type = 'interaction') AS interactions,
    COUNT(*) FILTER (WHERE event_type = 'conversion') AS conversions
  FROM public.widget_events
  WHERE business_id = _business_id
    AND occurred_at >= _start
    AND occurred_at < _end
    AND (public.user_in_business(auth.uid(), _business_id) OR public.is_admin(auth.uid()))
  GROUP BY 1
  ORDER BY 1;
$$;

-- =========================================================================
-- RLS
-- =========================================================================

ALTER TABLE public.businesses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_objects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonial_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widgets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_events        ENABLE ROW LEVEL SECURITY;

-- businesses
CREATE POLICY "members read business" ON public.businesses
  FOR SELECT USING (public.user_in_business(auth.uid(), id) OR public.is_admin(auth.uid()));
CREATE POLICY "owners update business" ON public.businesses
  FOR UPDATE USING (public.user_business_role(auth.uid(), id) = 'owner' OR public.is_admin(auth.uid()));
CREATE POLICY "admin insert business" ON public.businesses
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin delete business" ON public.businesses
  FOR DELETE USING (public.is_admin(auth.uid()));

-- users (each user sees their own row + admins see all)
CREATE POLICY "self read user" ON public.users
  FOR SELECT USING (id = auth.uid() OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.user_id = public.users.id
        AND public.user_in_business(auth.uid(), bu.business_id)
    ));
CREATE POLICY "self update user" ON public.users
  FOR UPDATE USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin insert user" ON public.users
  FOR INSERT WITH CHECK (true); -- handled by trigger on signup
CREATE POLICY "admin delete user" ON public.users
  FOR DELETE USING (public.is_admin(auth.uid()));

-- business_users
CREATE POLICY "members read membership" ON public.business_users
  FOR SELECT USING (public.user_in_business(auth.uid(), business_id) OR public.is_admin(auth.uid()));
CREATE POLICY "owners write membership" ON public.business_users
  FOR ALL USING (public.user_business_role(auth.uid(), business_id) = 'owner' OR public.is_admin(auth.uid()))
  WITH CHECK (public.user_business_role(auth.uid(), business_id) = 'owner' OR public.is_admin(auth.uid()));

-- proof_objects
CREATE POLICY "members read proof" ON public.proof_objects
  FOR SELECT USING (public.user_in_business(auth.uid(), business_id) OR public.is_admin(auth.uid()));
CREATE POLICY "editors write proof" ON public.proof_objects
  FOR ALL USING (
    public.user_business_role(auth.uid(), business_id) IN ('owner','editor') OR public.is_admin(auth.uid())
  ) WITH CHECK (
    public.user_business_role(auth.uid(), business_id) IN ('owner','editor') OR public.is_admin(auth.uid())
  );

-- testimonial_requests (members + public read by token done in edge function)
CREATE POLICY "members read treq" ON public.testimonial_requests
  FOR SELECT USING (public.user_in_business(auth.uid(), business_id) OR public.is_admin(auth.uid()));
CREATE POLICY "editors write treq" ON public.testimonial_requests
  FOR ALL USING (
    public.user_business_role(auth.uid(), business_id) IN ('owner','editor') OR public.is_admin(auth.uid())
  ) WITH CHECK (
    public.user_business_role(auth.uid(), business_id) IN ('owner','editor') OR public.is_admin(auth.uid())
  );

-- integrations
CREATE POLICY "members read integrations" ON public.integrations
  FOR SELECT USING (public.user_in_business(auth.uid(), business_id) OR public.is_admin(auth.uid()));
CREATE POLICY "editors write integrations" ON public.integrations
  FOR ALL USING (
    public.user_business_role(auth.uid(), business_id) IN ('owner','editor') OR public.is_admin(auth.uid())
  ) WITH CHECK (
    public.user_business_role(auth.uid(), business_id) IN ('owner','editor') OR public.is_admin(auth.uid())
  );

-- integration_events (members read; service writes)
CREATE POLICY "members read int events" ON public.integration_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.integrations i
      WHERE i.id = integration_events.integration_id
        AND (public.user_in_business(auth.uid(), i.business_id) OR public.is_admin(auth.uid()))
    )
  );

-- widgets
CREATE POLICY "members read widgets" ON public.widgets
  FOR SELECT USING (public.user_in_business(auth.uid(), business_id) OR public.is_admin(auth.uid()));
CREATE POLICY "editors write widgets" ON public.widgets
  FOR ALL USING (
    public.user_business_role(auth.uid(), business_id) IN ('owner','editor') OR public.is_admin(auth.uid())
  ) WITH CHECK (
    public.user_business_role(auth.uid(), business_id) IN ('owner','editor') OR public.is_admin(auth.uid())
  );

-- widget_events (members read; service writes via edge function)
CREATE POLICY "members read widget events" ON public.widget_events
  FOR SELECT USING (public.user_in_business(auth.uid(), business_id) OR public.is_admin(auth.uid()));
