-- =====================================================================
-- PHASE 1 CLOSEOUT — schema alignment
-- =====================================================================

-- 1) PLAN ENUM CLEANUP: drop legacy 'scale' value
DO $$
DECLARE has_scale boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'business_plan' AND e.enumlabel = 'scale'
  ) INTO has_scale;

  IF has_scale THEN
    -- Backfill any rows
    UPDATE public.businesses SET plan = 'agency'::public.business_plan WHERE plan::text = 'scale';

    -- Rebuild enum without 'scale'
    CREATE TYPE public.business_plan_new AS ENUM ('free','starter','growth','agency');

    ALTER TABLE public.businesses
      ALTER COLUMN plan DROP DEFAULT,
      ALTER COLUMN plan TYPE public.business_plan_new
        USING (CASE WHEN plan::text = 'scale' THEN 'agency' ELSE plan::text END)::public.business_plan_new,
      ALTER COLUMN plan SET DEFAULT 'free'::public.business_plan_new;

    DROP TYPE public.business_plan;
    ALTER TYPE public.business_plan_new RENAME TO business_plan;
  END IF;
END $$;

-- 2) BUSINESSES: add billing columns
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_tier public.business_plan,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS monthly_proof_limit integer,
  ADD COLUMN IF NOT EXISTS monthly_event_limit integer,
  ADD COLUMN IF NOT EXISTS extra_seats_purchased integer NOT NULL DEFAULT 0;

-- mirror plan into plan_tier for existing rows
UPDATE public.businesses SET plan_tier = plan WHERE plan_tier IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_stripe_customer_id_uq
  ON public.businesses (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 3) PROOF_OBJECTS: add integration-webhook columns
ALTER TABLE public.proof_objects
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS proof_type text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_tier_int integer,
  ADD COLUMN IF NOT EXISTS verification_method text,
  ADD COLUMN IF NOT EXISTS author_email text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS external_ref_id text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_event_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS proof_objects_business_source_external_uq
  ON public.proof_objects (business_id, source, external_ref_id)
  WHERE source IS NOT NULL AND external_ref_id IS NOT NULL;

-- 4) INTEGRATIONS: provider mirror, last_sync_at, auto_request_delay_days
ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_request_delay_days integer DEFAULT 14;

UPDATE public.integrations SET provider = platform::text WHERE provider IS NULL;

CREATE OR REPLACE FUNCTION public.tg_sync_integration_provider()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.provider IS NULL OR NEW.provider = '' THEN
    NEW.provider := NEW.platform::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_integration_provider ON public.integrations;
CREATE TRIGGER sync_integration_provider
  BEFORE INSERT OR UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_integration_provider();

-- 5) TESTIMONIAL_REQUESTS: add recipient_* / requested_type / prompt_questions
ALTER TABLE public.testimonial_requests
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS requested_type text DEFAULT 'testimonial',
  ADD COLUMN IF NOT EXISTS prompt_questions jsonb DEFAULT '[]'::jsonb;

UPDATE public.testimonial_requests
   SET recipient_email = COALESCE(recipient_email, customer_email),
       recipient_name  = COALESCE(recipient_name, customer_name);

CREATE OR REPLACE FUNCTION public.tg_sync_treq_recipient()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Mirror in both directions so old and new code both work.
  IF NEW.recipient_email IS NULL AND NEW.customer_email IS NOT NULL THEN
    NEW.recipient_email := NEW.customer_email;
  ELSIF NEW.customer_email IS NULL AND NEW.recipient_email IS NOT NULL THEN
    NEW.customer_email := NEW.recipient_email;
  END IF;
  IF NEW.recipient_name IS NULL AND NEW.customer_name IS NOT NULL THEN
    NEW.recipient_name := NEW.customer_name;
  ELSIF NEW.customer_name IS NULL AND NEW.recipient_name IS NOT NULL THEN
    NEW.customer_name := NEW.recipient_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_treq_recipient ON public.testimonial_requests;
CREATE TRIGGER sync_treq_recipient
  BEFORE INSERT OR UPDATE ON public.testimonial_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_treq_recipient();

-- testimonial_requests.customer_email is currently NOT NULL — relax it so
-- inserts with only recipient_email succeed (the trigger backfills it).
ALTER TABLE public.testimonial_requests
  ALTER COLUMN customer_email DROP NOT NULL;

-- 6) SCHEDULED_JOBS table
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  run_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_jobs_run_at_idx ON public.scheduled_jobs (status, run_at);
CREATE INDEX IF NOT EXISTS scheduled_jobs_business_idx ON public.scheduled_jobs (business_id);

ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read scheduled jobs" ON public.scheduled_jobs;
CREATE POLICY "members read scheduled jobs"
  ON public.scheduled_jobs FOR SELECT
  USING (public.user_in_business(auth.uid(), business_id) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admins write scheduled jobs" ON public.scheduled_jobs;
CREATE POLICY "admins write scheduled jobs"
  ON public.scheduled_jobs FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS scheduled_jobs_set_updated_at ON public.scheduled_jobs;
CREATE TRIGGER scheduled_jobs_set_updated_at
  BEFORE UPDATE ON public.scheduled_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 7) ADMIN AUDIT LOG + log_admin_action RPC
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  business_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx ON public.admin_audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_business_idx ON public.admin_audit_log (business_id, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read audit log" ON public.admin_audit_log;
CREATE POLICY "admins read audit log"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_admin_action(
  _business_id uuid,
  _action text,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can log admin actions';
  END IF;

  INSERT INTO public.admin_audit_log (actor_user_id, business_id, action, details)
  VALUES (auth.uid(), _business_id, _action, COALESCE(_details, '{}'::jsonb))
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(uuid, text, jsonb) TO authenticated;