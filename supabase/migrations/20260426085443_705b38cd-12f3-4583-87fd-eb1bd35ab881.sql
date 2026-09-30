
-- Storage / upload capability check
CREATE OR REPLACE FUNCTION public.can_upload_media(_business_id uuid, _additional_bytes bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_key text;
  cap_mb integer;
  used_bytes bigint;
BEGIN
  SELECT plan INTO plan_key FROM public.businesses WHERE id = _business_id;
  IF plan_key IS NULL THEN RETURN false; END IF;
  SELECT storage_mb INTO cap_mb FROM public.plan_limits(plan_key);
  SELECT COALESCE(SUM(media_size_bytes), 0)::bigint INTO used_bytes
    FROM public.proof_objects WHERE business_id = _business_id;
  RETURN (used_bytes + COALESCE(_additional_bytes, 0)) <= (cap_mb::bigint * 1024 * 1024);
END;
$$;

-- One-shot setter for upload metadata (only fills if NULL)
CREATE OR REPLACE FUNCTION public.update_proof_media_metadata(
  _proof_id uuid,
  _bytes bigint,
  _duration_seconds numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated int;
BEGIN
  UPDATE public.proof_objects
  SET
    media_size_bytes = COALESCE(media_size_bytes, _bytes),
    media_duration_seconds = COALESCE(media_duration_seconds, _duration_seconds),
    updated_at = now()
  WHERE id = _proof_id;
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

-- Resolve which business a collection token belongs to (for unauth uploads)
CREATE OR REPLACE FUNCTION public.business_id_for_collection_token(_token text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM public.testimonial_requests
  WHERE token = _token AND expires_at > now()
  LIMIT 1;
$$;
