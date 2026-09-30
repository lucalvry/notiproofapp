
ALTER TABLE public.proof_objects
  ADD COLUMN IF NOT EXISTS author_role text,
  ADD COLUMN IF NOT EXISTS author_company text,
  ADD COLUMN IF NOT EXISTS author_company_logo_url text,
  ADD COLUMN IF NOT EXISTS author_photo_url text,
  ADD COLUMN IF NOT EXISTS author_website_url text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_url text;

CREATE OR REPLACE FUNCTION public.submit_testimonial_request(
  _token text,
  _author_name text,
  _author_email text,
  _content text,
  _rating smallint DEFAULT NULL::smallint,
  _media_url text DEFAULT NULL::text,
  _author_role text DEFAULT NULL,
  _author_company text DEFAULT NULL,
  _author_photo_url text DEFAULT NULL,
  _author_website_url text DEFAULT NULL
)
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
    customer_email_hash, source, source_metadata, proof_event_at,
    author_role, author_company, author_photo_url, author_avatar_url, author_website_url
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
    now(),
    NULLIF(trim(_author_role), ''),
    NULLIF(trim(_author_company), ''),
    NULLIF(trim(_author_photo_url), ''),
    NULLIF(trim(_author_photo_url), ''),
    NULLIF(trim(_author_website_url), '')
  ) RETURNING id INTO proof_id;

  UPDATE public.testimonial_requests
  SET status = 'responded', responded_at = now(), completed_at = now(), proof_object_id = proof_id
  WHERE id = request_row.id;

  RETURN proof_id;
END;
$function$;
