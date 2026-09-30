-- Helper: normalize a URL/domain to a bare lowercase hostname.
CREATE OR REPLACE FUNCTION public.normalize_domain(_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v text;
BEGIN
  IF _raw IS NULL THEN RETURN NULL; END IF;
  v := lower(trim(_raw));
  v := regexp_replace(v, '^[a-z]+://', '');
  v := regexp_replace(v, '/.*$', '');
  v := regexp_replace(v, ':[0-9]+$', '');
  v := regexp_replace(v, '^www\.', '');
  RETURN v;
END;
$$;

-- Trigger function to normalize the domain on insert/update.
CREATE OR REPLACE FUNCTION public.tg_normalize_business_domain()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.domain := public.normalize_domain(NEW.domain);
  IF NEW.domain IS NULL OR NEW.domain = '' THEN
    RAISE EXCEPTION 'domain cannot be empty';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE public.business_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, domain)
);

CREATE TRIGGER trg_business_domains_normalize
BEFORE INSERT OR UPDATE OF domain ON public.business_domains
FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_business_domain();

CREATE INDEX business_domains_domain_idx
  ON public.business_domains (domain);

CREATE UNIQUE INDEX business_domains_one_primary_per_business
  ON public.business_domains (business_id) WHERE is_primary;

ALTER TABLE public.business_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read domains"
  ON public.business_domains
  FOR SELECT
  USING (public.user_in_business(auth.uid(), business_id) OR public.is_admin(auth.uid()));

CREATE POLICY "editors write domains"
  ON public.business_domains
  FOR ALL
  USING (
    public.user_business_role(auth.uid(), business_id) IN ('owner','editor')
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.user_business_role(auth.uid(), business_id) IN ('owner','editor')
    OR public.is_admin(auth.uid())
  );