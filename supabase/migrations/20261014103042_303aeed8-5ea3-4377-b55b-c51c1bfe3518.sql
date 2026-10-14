CREATE OR REPLACE FUNCTION public.business_trial_ended(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _business_id
      AND coalesce(b.plan, 'free') = 'free'
      AND b.trial_ends_at IS NOT NULL
      AND b.trial_ends_at <= now()
  ) AND NOT public.business_is_unlimited(_business_id)
$$;
REVOKE EXECUTE ON FUNCTION public.business_trial_ended(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.business_trial_ended(uuid) TO authenticated, service_role;

-- Signed-in users on an ended Free trial are view-only. System writes
-- (service role, public testimonial submissions) have no auth.uid() and pass.
CREATE OR REPLACE FUNCTION public.enforce_trial_active()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _biz uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN _biz := OLD.business_id; ELSE _biz := NEW.business_id; END IF;
  IF _biz IS NOT NULL AND public.business_trial_ended(_biz) THEN
    RAISE EXCEPTION 'TRIAL_ENDED: upgrade to make changes' USING ERRCODE = 'P0001';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['widgets','proof_objects','testimonial_requests','campaigns','integrations','content_pieces','case_studies','business_domains','team_invitations','publishing_channels','business_brand_voice']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_trial_active ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_enforce_trial_active BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_trial_active()', t);
  END LOOP;
END $$;