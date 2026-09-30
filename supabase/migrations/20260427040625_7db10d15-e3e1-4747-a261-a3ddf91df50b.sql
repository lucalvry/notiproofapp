CREATE OR REPLACE FUNCTION public.hash_proof_author_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.author_email IS NOT NULL AND length(trim(NEW.author_email)) > 0 THEN
    NEW.customer_email_hash := encode(extensions.digest(lower(trim(NEW.author_email)), 'sha256'), 'hex');
    -- Only strip the raw email for user-submitted testimonial content.
    -- Purchase / integration-owned proofs keep the email so we can send
    -- the testimonial request afterwards.
    IF COALESCE(NEW.proof_type::text, NEW.type::text) = 'testimonial' THEN
      NEW.author_email := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;