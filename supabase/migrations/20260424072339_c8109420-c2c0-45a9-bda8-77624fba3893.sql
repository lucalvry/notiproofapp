
-- Businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS script_id text UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex'),
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

UPDATE public.businesses
SET script_id = encode(extensions.gen_random_bytes(12), 'hex')
WHERE script_id IS NULL;

-- Proof objects
ALTER TABLE public.proof_objects
  ADD COLUMN IF NOT EXISTS verification_tier text,
  ADD COLUMN IF NOT EXISTS verification_method text,
  ADD COLUMN IF NOT EXISTS customer_email_hash text,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS raw_content text,
  ADD COLUMN IF NOT EXISTS external_ref_id text,
  ADD COLUMN IF NOT EXISTS product_reference text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS proof_event_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_proof_customer_email_hash ON public.proof_objects(customer_email_hash);
CREATE INDEX IF NOT EXISTS idx_proof_external_ref ON public.proof_objects(external_ref_id);
CREATE INDEX IF NOT EXISTS idx_proof_tags ON public.proof_objects USING gin(tags);

-- Migrate proof statuses
UPDATE public.proof_objects SET status = 'pending_review' WHERE status = 'pending';
ALTER TABLE public.proof_objects ALTER COLUMN status SET DEFAULT 'pending_review'::proof_status;

-- Migrate testimonial request statuses
UPDATE public.testimonial_requests SET status = 'scheduled' WHERE status = 'pending';
UPDATE public.testimonial_requests SET status = 'responded' WHERE status = 'completed';
ALTER TABLE public.testimonial_requests ALTER COLUMN status SET DEFAULT 'scheduled'::testimonial_request_status;

-- Testimonial request fields
ALTER TABLE public.testimonial_requests
  ADD COLUMN IF NOT EXISTS requested_type text NOT NULL DEFAULT 'testimonial',
  ADD COLUMN IF NOT EXISTS prompt_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_message text,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- Update submit RPC
CREATE OR REPLACE FUNCTION public.submit_testimonial_request(_token text, _author_name text, _author_email text, _content text, _rating smallint DEFAULT NULL::smallint, _media_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  request_row public.testimonial_requests%ROWTYPE;
  proof_id uuid;
BEGIN
  SELECT * INTO request_row
  FROM public.testimonial_requests
  WHERE token = _token
    AND expires_at > now()
    AND status NOT IN ('responded','completed')
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This testimonial link is invalid or has expired';
  END IF;

  IF _content IS NULL OR length(trim(_content)) < 10 THEN
    RAISE EXCEPTION 'Please enter a testimonial with at least 10 characters';
  END IF;

  IF _rating IS NOT NULL AND (_rating < 1 OR _rating > 5) THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  INSERT INTO public.proof_objects (
    business_id, type, status, author_name, author_email,
    content, raw_content, rating, media_url, video_url,
    customer_email_hash, source, source_metadata, proof_event_at
  ) VALUES (
    request_row.business_id,
    'testimonial',
    'pending_review',
    NULLIF(trim(_author_name), ''),
    NULLIF(trim(_author_email), ''),
    trim(_content),
    trim(_content),
    _rating,
    NULLIF(trim(_media_url), ''),
    NULLIF(trim(_media_url), ''),
    CASE WHEN _author_email IS NOT NULL AND length(trim(_author_email)) > 0
         THEN encode(extensions.digest(lower(trim(_author_email)), 'sha256'), 'hex')
         ELSE NULL END,
    'testimonial_request',
    jsonb_build_object('request_id', request_row.id),
    now()
  ) RETURNING id INTO proof_id;

  UPDATE public.testimonial_requests
  SET status = 'responded', responded_at = now(), completed_at = now(), proof_object_id = proof_id
  WHERE id = request_row.id;

  RETURN proof_id;
END;
$function$;

-- Mark opened helper
CREATE OR REPLACE FUNCTION public.mark_testimonial_request_opened(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.testimonial_requests
  SET status = CASE WHEN status IN ('scheduled','sent','pending') THEN 'opened'::testimonial_request_status ELSE status END,
      opened_at = COALESCE(opened_at, now())
  WHERE token = _token AND expires_at > now();
  RETURN FOUND;
END;
$$;
