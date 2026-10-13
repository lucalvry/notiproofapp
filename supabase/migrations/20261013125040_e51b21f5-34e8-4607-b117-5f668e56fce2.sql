CREATE TABLE public.signup_attribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  reason text NOT NULL,
  reason_other text,
  source text NOT NULL,
  source_detail text,
  referral_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.signup_attribution TO authenticated;
GRANT ALL ON public.signup_attribution TO service_role;
ALTER TABLE public.signup_attribution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attribution read" ON public.signup_attribution FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_platform_admin());

CREATE TABLE public.referral_codes (
  user_id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own code read" ON public.referral_codes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_platform_admin());

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'signed_up',
  first_paid_at timestamptz,
  churned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_referral CHECK (referrer_user_id <> referred_user_id)
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrer read" ON public.referrals FOR SELECT TO authenticated USING (referrer_user_id = auth.uid() OR public.is_platform_admin());
CREATE TRIGGER referrals_updated_at BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL,
  stripe_invoice_id text NOT NULL UNIQUE,
  stripe_charge_id text,
  amount_paid_cents integer NOT NULL,
  commission_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  paid_out_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.referral_commissions TO authenticated;
GRANT ALL ON public.referral_commissions TO service_role;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrer commissions read" ON public.referral_commissions FOR SELECT TO authenticated USING (referrer_user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "admin commissions update" ON public.referral_commissions FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER referral_commissions_updated_at BEFORE UPDATE ON public.referral_commissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.referral_payout_details (
  user_id uuid PRIMARY KEY,
  method text NOT NULL DEFAULT 'paypal',
  details text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.referral_payout_details TO authenticated;
GRANT ALL ON public.referral_payout_details TO service_role;
ALTER TABLE public.referral_payout_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payout read" ON public.referral_payout_details FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "own payout insert" ON public.referral_payout_details FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own payout update" ON public.referral_payout_details FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER referral_payout_details_updated_at BEFORE UPDATE ON public.referral_payout_details FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Get or create the caller's referral code
CREATE OR REPLACE FUNCTION public.get_my_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _code text; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT code INTO _code FROM referral_codes WHERE user_id = _uid;
  IF _code IS NOT NULL THEN RETURN _code; END IF;
  LOOP
    _code := lower(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    BEGIN
      INSERT INTO referral_codes(user_id, code) VALUES (_uid, _code);
      RETURN _code;
    EXCEPTION WHEN unique_violation THEN
      SELECT code INTO _code FROM referral_codes WHERE user_id = _uid;
      IF _code IS NOT NULL THEN RETURN _code; END IF;
    END;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.get_my_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referral_code() TO authenticated;

-- Public click counter (rate limited per code)
CREATE OR REPLACE FUNCTION public.track_referral_click(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _referrer uuid;
BEGIN
  IF _code IS NULL OR length(_code) > 32 THEN RETURN false; END IF;
  IF NOT public.check_rate_limit('refclick:' || lower(_code), 500, 3600) THEN RETURN false; END IF;
  UPDATE referral_codes SET clicks = clicks + 1 WHERE code = lower(_code) RETURNING user_id INTO _referrer;
  RETURN _referrer IS NOT NULL;
END $$;
GRANT EXECUTE ON FUNCTION public.track_referral_click(text) TO anon, authenticated;

-- Public lookup of referrer first name for the sign-up banner
CREATE OR REPLACE FUNCTION public.referrer_display_name(_code text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT split_part(coalesce(nullif(u.full_name,''), 'A NotiProof user'), ' ', 1)
  FROM referral_codes rc JOIN users u ON u.id = rc.user_id WHERE rc.code = lower(_code)
$$;
GRANT EXECUTE ON FUNCTION public.referrer_display_name(text) TO anon, authenticated;

-- Record the caller's sign-up answers once; links a referral when a valid code is given
CREATE OR REPLACE FUNCTION public.record_signup_attribution(
  _reason text, _reason_other text, _source text, _source_detail text, _referral_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _referrer uuid; _code text := lower(nullif(trim(_referral_code),''));
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF coalesce(trim(_reason),'') = '' OR coalesce(trim(_source),'') = '' THEN RAISE EXCEPTION 'reason and source are required'; END IF;
  IF EXISTS (SELECT 1 FROM signup_attribution WHERE user_id = _uid) THEN RETURN false; END IF;
  INSERT INTO signup_attribution(user_id, reason, reason_other, source, source_detail, referral_code)
  VALUES (_uid, left(_reason,64), left(_reason_other,300), left(_source,64), left(_source_detail,300), _code);
  IF _code IS NOT NULL THEN
    SELECT user_id INTO _referrer FROM referral_codes WHERE code = _code;
    IF _referrer IS NOT NULL AND _referrer <> _uid THEN
      INSERT INTO referrals(referrer_user_id, referred_user_id, code) VALUES (_referrer, _uid, _code)
      ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_signup_attribution(text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_signup_attribution(text,text,text,text,text) TO authenticated;

-- Admin summary of sign-up sources
CREATE OR REPLACE FUNCTION public.admin_signup_sources()
RETURNS TABLE(source text, source_detail text, reason text, signups integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.source, coalesce(a.source_detail,''), a.reason, count(*)::int
  FROM signup_attribution a WHERE public.is_platform_admin()
  GROUP BY 1,2,3 ORDER BY 4 DESC
$$;
REVOKE ALL ON FUNCTION public.admin_signup_sources() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_signup_sources() TO authenticated;