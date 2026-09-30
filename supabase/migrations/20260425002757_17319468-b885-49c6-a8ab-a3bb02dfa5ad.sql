-- K1: Spec conformance — rename columns, add A/B + analytics fields, add typed integration columns
-- Strategy: add new column, copy data, keep old column for one release as a generated/sync alias,
-- then frontend & functions will be migrated in the same release.

-- ============ proof_objects ============
-- 1a. Rename type -> proof_type (add new column, backfill, keep old as a synced alias via trigger)
ALTER TABLE public.proof_objects ADD COLUMN IF NOT EXISTS proof_type public.proof_type;
UPDATE public.proof_objects SET proof_type = type WHERE proof_type IS NULL;
ALTER TABLE public.proof_objects ALTER COLUMN proof_type SET NOT NULL;

-- 1b. verification_tier text -> integer (1/2/3). Map common text values, default NULL otherwise.
ALTER TABLE public.proof_objects ADD COLUMN IF NOT EXISTS verification_tier_int integer;
UPDATE public.proof_objects
SET verification_tier_int = CASE
  WHEN verification_tier ~ '^[0-9]+$' THEN verification_tier::int
  WHEN lower(verification_tier) IN ('verified','tier_3','tier3','3','high') THEN 3
  WHEN lower(verification_tier) IN ('partial','tier_2','tier2','2','medium') THEN 2
  WHEN lower(verification_tier) IN ('unverified','tier_1','tier1','1','low') THEN 1
  ELSE NULL
END
WHERE verification_tier IS NOT NULL AND verification_tier_int IS NULL;
ALTER TABLE public.proof_objects ADD CONSTRAINT proof_verification_tier_int_range CHECK (verification_tier_int IS NULL OR verification_tier_int BETWEEN 1 AND 3);

-- Trigger to keep proof_type / type in sync both ways during transition
CREATE OR REPLACE FUNCTION public.sync_proof_type_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.proof_type IS NOT NULL AND (NEW.type IS NULL OR NEW.type <> NEW.proof_type) THEN
    NEW.type := NEW.proof_type;
  ELSIF NEW.type IS NOT NULL AND (NEW.proof_type IS NULL OR NEW.proof_type <> NEW.type) THEN
    NEW.proof_type := NEW.type;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_proof_type_columns_tg ON public.proof_objects;
CREATE TRIGGER sync_proof_type_columns_tg
BEFORE INSERT OR UPDATE ON public.proof_objects
FOR EACH ROW EXECUTE FUNCTION public.sync_proof_type_columns();

-- ============ integrations ============
-- Rename provider -> platform (additive). Keep both in sync.
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS platform public.integration_provider;
UPDATE public.integrations SET platform = provider WHERE platform IS NULL;
ALTER TABLE public.integrations ALTER COLUMN platform SET NOT NULL;

-- Typed columns for credentials & auto-request behavior
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS api_token text;
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS auto_request_delay_minutes integer;

-- Backfill from existing JSONB
UPDATE public.integrations
SET api_token = COALESCE(api_token, NULLIF(credentials->>'api_token',''), NULLIF(credentials->>'token',''))
WHERE api_token IS NULL;

UPDATE public.integrations
SET auto_request_delay_minutes = COALESCE(
  auto_request_delay_minutes,
  NULLIF((config->>'auto_request_delay_minutes')::int, NULL)
)
WHERE auto_request_delay_minutes IS NULL
  AND (config ? 'auto_request_delay_minutes');

CREATE OR REPLACE FUNCTION public.sync_integration_provider_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.platform IS NOT NULL AND (NEW.provider IS NULL OR NEW.provider <> NEW.platform) THEN
    NEW.provider := NEW.platform;
  ELSIF NEW.provider IS NOT NULL AND (NEW.platform IS NULL OR NEW.platform <> NEW.provider) THEN
    NEW.platform := NEW.provider;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_integration_provider_columns_tg ON public.integrations;
CREATE TRIGGER sync_integration_provider_columns_tg
BEFORE INSERT OR UPDATE ON public.integrations
FOR EACH ROW EXECUTE FUNCTION public.sync_integration_provider_columns();

-- ============ widgets — A/B testing & runtime fields ============
ALTER TABLE public.widgets ADD COLUMN IF NOT EXISTS variant text;
ALTER TABLE public.widgets ADD COLUMN IF NOT EXISTS ab_test_group_id uuid;
ALTER TABLE public.widgets ADD COLUMN IF NOT EXISTS impressions_total integer NOT NULL DEFAULT 0;
ALTER TABLE public.widgets ADD COLUMN IF NOT EXISTS frequency_cap_per_user integer;
ALTER TABLE public.widgets ADD COLUMN IF NOT EXISTS load_delay_ms integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_widgets_ab_group ON public.widgets(ab_test_group_id) WHERE ab_test_group_id IS NOT NULL;

-- ============ K2: Email-hash privacy ============
-- Trigger: whenever an author_email is provided, compute customer_email_hash and clear the raw email.
CREATE OR REPLACE FUNCTION public.hash_proof_author_email()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.author_email IS NOT NULL AND length(trim(NEW.author_email)) > 0 THEN
    NEW.customer_email_hash := encode(extensions.digest(lower(trim(NEW.author_email)), 'sha256'), 'hex');
    NEW.author_email := NULL; -- never persist raw email
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS hash_proof_author_email_tg ON public.proof_objects;
CREATE TRIGGER hash_proof_author_email_tg
BEFORE INSERT OR UPDATE ON public.proof_objects
FOR EACH ROW EXECUTE FUNCTION public.hash_proof_author_email();

-- Backfill: hash + clear any existing raw emails
UPDATE public.proof_objects
SET customer_email_hash = COALESCE(
      customer_email_hash,
      encode(extensions.digest(lower(trim(author_email)), 'sha256'), 'hex')
    ),
    author_email = NULL
WHERE author_email IS NOT NULL;

-- ============ K7: create_business RPC for business switcher / multi-business ============
CREATE OR REPLACE FUNCTION public.create_business(_name text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id uuid;
  trimmed text := NULLIF(trim(_name), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF trimmed IS NULL THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;

  INSERT INTO public.businesses (name) VALUES (trimmed) RETURNING id INTO new_id;
  INSERT INTO public.business_users (business_id, user_id, role)
    VALUES (new_id, auth.uid(), 'owner');

  RETURN new_id;
END;
$$;