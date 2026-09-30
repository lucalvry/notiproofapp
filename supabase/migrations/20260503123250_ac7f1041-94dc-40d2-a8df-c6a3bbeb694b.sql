
-- ============================================================================
-- PHASE 2 SPRINT 0 — Foundation Migration
-- ============================================================================

-- Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENUMS
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE public.content_output_type AS ENUM (
    'twitter_post','linkedin_post','email_block','ad_copy_headline',
    'ad_copy_body','website_quote','short_caption','meta_description','case_study_section'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.content_piece_status AS ENUM ('draft','approved','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.campaign_type AS ENUM ('post_purchase','milestone','anniversary','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.publish_channel_provider AS ENUM (
    'buffer','mailchimp','klaviyo','convertkit','linkedin','twitter'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.publish_event_status AS ENUM (
    'scheduled','publishing','published','failed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.case_study_status AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- TABLE: business_brand_voice
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.business_brand_voice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE,
  default_tone text NOT NULL DEFAULT 'professional',
  voice_examples text,
  avoid_words text[] NOT NULL DEFAULT '{}',
  use_words text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_brand_voice ENABLE ROW LEVEL SECURITY;

CREATE POLICY bbv_member_select ON public.business_brand_voice
  FOR SELECT TO authenticated
  USING (is_business_member(business_id) OR is_platform_admin());
CREATE POLICY bbv_editor_insert ON public.business_brand_voice
  FOR INSERT TO authenticated
  WITH CHECK (has_business_role(business_id,'editor') OR is_platform_admin());
CREATE POLICY bbv_editor_update ON public.business_brand_voice
  FOR UPDATE TO authenticated
  USING (has_business_role(business_id,'editor') OR is_platform_admin())
  WITH CHECK (has_business_role(business_id,'editor') OR is_platform_admin());
CREATE POLICY bbv_editor_delete ON public.business_brand_voice
  FOR DELETE TO authenticated
  USING (has_business_role(business_id,'editor') OR is_platform_admin());

CREATE TRIGGER tg_bbv_updated_at BEFORE UPDATE ON public.business_brand_voice
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABLE: content_pieces
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.content_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  proof_object_id uuid NOT NULL,
  output_type public.content_output_type NOT NULL,
  content text NOT NULL,
  original_content text NOT NULL,
  tone_used text,
  status public.content_piece_status NOT NULL DEFAULT 'draft',
  char_count integer NOT NULL DEFAULT 0,
  edit_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_model text,
  generation_prompt text,
  published_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_content_pieces_business ON public.content_pieces(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_pieces_proof ON public.content_pieces(proof_object_id);
ALTER TABLE public.content_pieces ENABLE ROW LEVEL SECURITY;

CREATE POLICY cp_member_select ON public.content_pieces
  FOR SELECT TO authenticated
  USING (is_business_member(business_id) OR is_platform_admin());
CREATE POLICY cp_editor_insert ON public.content_pieces
  FOR INSERT TO authenticated
  WITH CHECK (has_business_role(business_id,'editor') OR is_platform_admin());
CREATE POLICY cp_editor_update ON public.content_pieces
  FOR UPDATE TO authenticated
  USING (has_business_role(business_id,'editor') OR is_platform_admin());
CREATE POLICY cp_editor_delete ON public.content_pieces
  FOR DELETE TO authenticated
  USING (has_business_role(business_id,'editor') OR is_platform_admin());

CREATE TRIGGER tg_cp_updated_at BEFORE UPDATE ON public.content_pieces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABLE: publishing_channels
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.publishing_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider public.publish_channel_provider NOT NULL,
  account_label text,
  credentials_encrypted bytea,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pub_channels_business ON public.publishing_channels(business_id);
ALTER TABLE public.publishing_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY pch_member_select ON public.publishing_channels
  FOR SELECT TO authenticated
  USING (is_business_member(business_id) OR is_platform_admin());
CREATE POLICY pch_editor_insert ON public.publishing_channels
  FOR INSERT TO authenticated
  WITH CHECK (has_business_role(business_id,'editor') OR is_platform_admin());
CREATE POLICY pch_editor_update ON public.publishing_channels
  FOR UPDATE TO authenticated
  USING (has_business_role(business_id,'editor') OR is_platform_admin());
CREATE POLICY pch_editor_delete ON public.publishing_channels
  FOR DELETE TO authenticated
  USING (has_business_role(business_id,'editor') OR is_platform_admin());

CREATE TRIGGER tg_pch_updated_at BEFORE UPDATE ON public.publishing_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABLE: content_publish_events
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.content_publish_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  content_piece_id uuid NOT NULL REFERENCES public.content_pieces(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.publishing_channels(id) ON DELETE SET NULL,
  scheduled_at timestamptz,
  published_at timestamptz,
  external_post_url text,
  status public.publish_event_status NOT NULL DEFAULT 'scheduled',
  error_message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpe_business ON public.content_publish_events(business_id);
CREATE INDEX IF NOT EXISTS idx_cpe_status_sched ON public.content_publish_events(status, scheduled_at);
ALTER TABLE public.content_publish_events ENABLE ROW LEVEL SECURITY;

-- SELECT to members; INSERT/UPDATE/DELETE only via service role (no policies = blocked)
CREATE POLICY cpe_member_select ON public.content_publish_events
  FOR SELECT TO authenticated
  USING (is_business_member(business_id) OR is_platform_admin());

CREATE TRIGGER tg_cpe_updated_at BEFORE UPDATE ON public.content_publish_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABLE: campaigns
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  type public.campaign_type NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  requests_sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_business_active ON public.campaigns(business_id, is_active);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY camp_member_select ON public.campaigns
  FOR SELECT TO authenticated
  USING (is_business_member(business_id) OR is_platform_admin());
CREATE POLICY camp_editor_insert ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (has_business_role(business_id,'editor') OR is_platform_admin());
CREATE POLICY camp_editor_update ON public.campaigns
  FOR UPDATE TO authenticated
  USING (has_business_role(business_id,'editor') OR is_platform_admin());
CREATE POLICY camp_editor_delete ON public.campaigns
  FOR DELETE TO authenticated
  USING (has_business_role(business_id,'editor') OR is_platform_admin());

CREATE TRIGGER tg_camp_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABLE: case_studies
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  customer_handle text,
  title text NOT NULL,
  slug text,
  content text,
  meta_title text,
  meta_description text,
  status public.case_study_status NOT NULL DEFAULT 'draft',
  length_target text,
  tone text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  edit_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_case_studies_business ON public.case_studies(business_id, created_at DESC);
ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_member_select ON public.case_studies
  FOR SELECT TO authenticated
  USING (is_business_member(business_id) OR is_platform_admin());
CREATE POLICY cs_editor_insert ON public.case_studies
  FOR INSERT TO authenticated
  WITH CHECK (has_business_role(business_id,'editor') OR is_platform_admin());
CREATE POLICY cs_editor_update ON public.case_studies
  FOR UPDATE TO authenticated
  USING (has_business_role(business_id,'editor') OR is_platform_admin());
CREATE POLICY cs_editor_delete ON public.case_studies
  FOR DELETE TO authenticated
  USING (has_business_role(business_id,'editor') OR is_platform_admin());

CREATE TRIGGER tg_cs_updated_at BEFORE UPDATE ON public.case_studies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABLE: case_study_proof_links
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.case_study_proof_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_study_id uuid NOT NULL REFERENCES public.case_studies(id) ON DELETE CASCADE,
  proof_object_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_study_id, proof_object_id)
);
CREATE INDEX IF NOT EXISTS idx_cspl_case ON public.case_study_proof_links(case_study_id);
CREATE INDEX IF NOT EXISTS idx_cspl_proof ON public.case_study_proof_links(proof_object_id);
ALTER TABLE public.case_study_proof_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY cspl_member_select ON public.case_study_proof_links
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.case_studies cs WHERE cs.id = case_study_id
    AND (is_business_member(cs.business_id) OR is_platform_admin())));
CREATE POLICY cspl_editor_insert ON public.case_study_proof_links
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.case_studies cs WHERE cs.id = case_study_id
    AND (has_business_role(cs.business_id,'editor') OR is_platform_admin())));
CREATE POLICY cspl_editor_update ON public.case_study_proof_links
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.case_studies cs WHERE cs.id = case_study_id
    AND (has_business_role(cs.business_id,'editor') OR is_platform_admin())));
CREATE POLICY cspl_editor_delete ON public.case_study_proof_links
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.case_studies cs WHERE cs.id = case_study_id
    AND (has_business_role(cs.business_id,'editor') OR is_platform_admin())));

-- ============================================================================
-- COLUMN ADDITIONS to Phase 1 tables
-- ============================================================================
ALTER TABLE public.proof_objects
  ADD COLUMN IF NOT EXISTS content_pieces_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.testimonial_requests
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS send_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_delay_days integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_treq_status_send_at ON public.testimonial_requests(status, send_at);

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS content_auto_generate boolean NOT NULL DEFAULT false;

-- ============================================================================
-- TRIGGER: increment content_pieces_count
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_proof_content_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.proof_objects
    SET content_pieces_count = COALESCE(content_pieces_count,0) + 1
    WHERE id = NEW.proof_object_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_increment_proof_content_count ON public.content_pieces;
CREATE TRIGGER tg_increment_proof_content_count
  AFTER INSERT ON public.content_pieces
  FOR EACH ROW EXECUTE FUNCTION public.increment_proof_content_count();

-- ============================================================================
-- TRIGGER: campaign trigger evaluator (calls EF-03 via pg_net)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_call_campaign_evaluator()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fn_url text;
  internal_secret text;
BEGIN
  SELECT value INTO fn_url FROM public.app_secrets WHERE name = 'EF_CAMPAIGN_EVALUATOR_URL';
  SELECT value INTO internal_secret FROM public.app_secrets WHERE name = 'INTERNAL_TRIGGER_SECRET';
  IF fn_url IS NULL OR internal_secret IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-internal-secret', internal_secret
    ),
    body := jsonb_build_object('event', to_jsonb(NEW))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the integration_events insert
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_campaign_eval ON public.integration_events;
CREATE TRIGGER tg_campaign_eval
  AFTER INSERT ON public.integration_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_call_campaign_evaluator();

-- ============================================================================
-- pg_cron: scheduled email sender
-- ============================================================================
DO $$
DECLARE
  job_id integer;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'notiproof-scheduled-email-sender';
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;

  PERFORM cron.schedule(
    'notiproof-scheduled-email-sender',
    '*/15 * * * *',
    $cron$
    SELECT net.http_post(
      url := COALESCE((SELECT value FROM public.app_secrets WHERE name='EF_SCHEDULED_EMAIL_SENDER_URL'),''),
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-internal-secret', COALESCE((SELECT value FROM public.app_secrets WHERE name='INTERNAL_TRIGGER_SECRET'),'')
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
END $$;
