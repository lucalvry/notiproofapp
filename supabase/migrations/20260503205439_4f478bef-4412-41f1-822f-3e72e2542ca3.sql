-- #2 case_studies hardening
ALTER TABLE public.case_studies ADD COLUMN IF NOT EXISTS original_content text;
ALTER TABLE public.case_studies ADD COLUMN IF NOT EXISTS ai_model text;
UPDATE public.case_studies SET original_content = COALESCE(content, '') WHERE original_content IS NULL;
UPDATE public.case_studies SET ai_model = 'claude-sonnet-4-20250514' WHERE ai_model IS NULL;
ALTER TABLE public.case_studies ALTER COLUMN original_content SET NOT NULL;
ALTER TABLE public.case_studies ALTER COLUMN ai_model SET NOT NULL;

-- #9 case_studies extras
ALTER TABLE public.case_studies ADD COLUMN IF NOT EXISTS word_count int;
CREATE UNIQUE INDEX IF NOT EXISTS case_studies_business_slug_uniq
  ON public.case_studies(business_id, slug) WHERE slug IS NOT NULL;
UPDATE public.case_studies SET tone = COALESCE(tone, 'professional'),
                               length_target = COALESCE(length_target, 'medium');
ALTER TABLE public.case_studies
  ALTER COLUMN tone SET DEFAULT 'professional',
  ALTER COLUMN tone SET NOT NULL,
  ALTER COLUMN length_target SET DEFAULT 'medium',
  ALTER COLUMN length_target SET NOT NULL;

-- #4 content_publish_events analytics
ALTER TABLE public.content_publish_events
  ADD COLUMN IF NOT EXISTS impressions int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS external_post_id text;

-- #6 campaigns response counter
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS responses_received_count int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.tg_campaign_increment_response()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.campaign_id IS NOT NULL
     AND NEW.responded_at IS NOT NULL
     AND OLD.responded_at IS NULL THEN
    UPDATE public.campaigns
       SET responses_received_count = responses_received_count + 1,
           updated_at = now()
     WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_campaign_increment_response ON public.testimonial_requests;
CREATE TRIGGER trg_campaign_increment_response
  AFTER UPDATE ON public.testimonial_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_campaign_increment_response();

-- #10 publishing_channels OAuth fields
-- NOTE — Field-name deviations from Phase 2 spec:
--   spec: channel_type       -> impl: provider             (USER-DEFINED enum)
--   spec: display_name       -> impl: account_label
--   spec: credentials(jsonb) -> impl: credentials_encrypted (bytea, AES-GCM)
-- Reason: aligned with Phase 1 PII encryption work and reuse of the shared
-- publishing_provider enum. Functional parity preserved.
ALTER TABLE public.publishing_channels
  ADD COLUMN IF NOT EXISTS external_account_id text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

-- #5 auto-generate content trigger
CREATE OR REPLACE FUNCTION public.tg_proof_auto_generate_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fn_url text;
  secret text;
  auto_on boolean;
BEGIN
  IF NEW.status::text <> 'approved' OR OLD.status::text = 'approved' THEN
    RETURN NEW;
  END IF;
  SELECT content_auto_generate INTO auto_on FROM public.businesses WHERE id = NEW.business_id;
  IF NOT COALESCE(auto_on, false) THEN
    RETURN NEW;
  END IF;
  SELECT value INTO fn_url FROM public.app_secrets WHERE name = 'EF_GENERATE_CONTENT_URL';
  SELECT value INTO secret FROM public.app_secrets WHERE name = 'INTERNAL_TRIGGER_SECRET';
  IF fn_url IS NULL OR secret IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type','application/json','x-internal-secret',secret),
    body := jsonb_build_object('proof_object_id', NEW.id, 'business_id', NEW.business_id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_proof_auto_generate ON public.proof_objects;
CREATE TRIGGER trg_proof_auto_generate
  AFTER UPDATE OF status ON public.proof_objects
  FOR EACH ROW EXECUTE FUNCTION public.tg_proof_auto_generate_content();

-- #8 content_pieces_count delete branch
CREATE OR REPLACE FUNCTION public.decrement_proof_content_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.proof_objects
     SET content_pieces_count = GREATEST(COALESCE(content_pieces_count, 1) - 1, 0),
         updated_at = now()
   WHERE id = OLD.proof_object_id;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_content_pieces_decrement ON public.content_pieces;
CREATE TRIGGER trg_content_pieces_decrement
  AFTER DELETE ON public.content_pieces
  FOR EACH ROW EXECUTE FUNCTION public.decrement_proof_content_count();