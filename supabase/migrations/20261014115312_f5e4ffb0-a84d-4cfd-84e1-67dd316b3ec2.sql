CREATE OR REPLACE FUNCTION public.create_open_collection_request(_business_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tok text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = _business_id AND suspended_at IS NULL) THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF NOT public.check_rate_limit('open_collect:' || _business_id::text, 200, 3600) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  INSERT INTO testimonial_requests (business_id, recipient_email, status, sent_at, reminder_enabled, source_hint)
  VALUES (_business_id, 'open-link@notiproof.xyz', 'sent', now(), false, NULL)
  RETURNING token INTO _tok;
  RETURN _tok;
END $$;