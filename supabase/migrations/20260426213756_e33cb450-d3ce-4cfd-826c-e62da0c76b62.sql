-- 1. integrations: new fields
ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS auto_request_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_request_delay_days integer NOT NULL DEFAULT 14;

-- 2. scheduled_jobs table
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  job_type text NOT NULL DEFAULT 'send_testimonial_email',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  run_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_jobs_run_at_idx
  ON public.scheduled_jobs (status, run_at);

ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sj_member_select ON public.scheduled_jobs;
CREATE POLICY sj_member_select ON public.scheduled_jobs
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR (business_id IS NOT NULL AND public.is_business_member(business_id))
  );

DROP TRIGGER IF EXISTS scheduled_jobs_set_updated_at ON public.scheduled_jobs;
CREATE TRIGGER scheduled_jobs_set_updated_at
  BEFORE UPDATE ON public.scheduled_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Backfill existing NULL proof_object_id rows
DO $$
DECLARE
  r RECORD;
  new_proof uuid;
BEGIN
  FOR r IN SELECT id, business_id FROM public.testimonial_requests WHERE proof_object_id IS NULL LOOP
    INSERT INTO public.proof_objects (
      business_id, type, proof_type, source, status,
      verification_tier_int, verification_method
    ) VALUES (
      r.business_id, 'testimonial', 'testimonial', 'native', 'pending_review',
      3, 'self_submitted'
    ) RETURNING id INTO new_proof;

    UPDATE public.testimonial_requests
       SET proof_object_id = new_proof
     WHERE id = r.id;
  END LOOP;
END $$;

-- 4. Enforce non-null going forward
ALTER TABLE public.testimonial_requests
  ALTER COLUMN proof_object_id SET NOT NULL;

-- 5. Helper RPC for manual modal placeholder creation
CREATE OR REPLACE FUNCTION public.create_placeholder_proof_for_request(_business_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT (public.is_business_member(_business_id) OR public.is_platform_admin()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF NOT public.can_create_proof(_business_id) THEN
    RAISE EXCEPTION 'Monthly proof limit reached';
  END IF;

  INSERT INTO public.proof_objects (
    business_id, type, proof_type, source, status,
    verification_tier_int, verification_method
  ) VALUES (
    _business_id, 'testimonial', 'testimonial', 'native', 'pending_review',
    3, 'self_submitted'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;