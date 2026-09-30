CREATE OR REPLACE FUNCTION public.get_testimonial_request(_token text)
RETURNS TABLE (
  token text,
  recipient_name text,
  status public.testimonial_request_status,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tr.token, tr.recipient_name, tr.status, tr.expires_at
  FROM public.testimonial_requests tr
  WHERE tr.token = _token
    AND tr.expires_at > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_testimonial_request(
  _token text,
  _author_name text,
  _author_email text,
  _content text,
  _rating smallint DEFAULT NULL,
  _media_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.testimonial_requests%ROWTYPE;
  proof_id uuid;
BEGIN
  SELECT * INTO request_row
  FROM public.testimonial_requests
  WHERE token = _token
    AND expires_at > now()
    AND status <> 'completed'
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
    business_id,
    type,
    status,
    author_name,
    author_email,
    content,
    rating,
    media_url,
    source,
    source_metadata
  ) VALUES (
    request_row.business_id,
    'testimonial',
    'pending',
    NULLIF(trim(_author_name), ''),
    NULLIF(trim(_author_email), ''),
    trim(_content),
    _rating,
    NULLIF(trim(_media_url), ''),
    'testimonial_request',
    jsonb_build_object('request_id', request_row.id)
  ) RETURNING id INTO proof_id;

  UPDATE public.testimonial_requests
  SET status = 'completed', completed_at = now(), proof_object_id = proof_id
  WHERE id = request_row.id;

  RETURN proof_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_testimonial_request(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_testimonial_request(text, text, text, text, smallint, text) TO anon, authenticated;