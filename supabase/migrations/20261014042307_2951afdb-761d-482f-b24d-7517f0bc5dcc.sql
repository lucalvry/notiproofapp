CREATE TABLE public.industries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_by_ai boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.industries TO anon, authenticated;
GRANT ALL ON public.industries TO service_role;
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read industries" ON public.industries FOR SELECT USING (true);

INSERT INTO public.industries (name, slug) VALUES
 ('Agriculture','agriculture'),('Agency & Marketing','agency-marketing'),('Automotive','automotive'),('Beauty & Personal Care','beauty-personal-care'),
 ('Coaching & Consulting','coaching-consulting'),('Construction & Home Services','construction-home-services'),('E-commerce & Retail','ecommerce-retail'),
 ('Education & Courses','education-courses'),('Events & Entertainment','events-entertainment'),('Fashion & Apparel','fashion-apparel'),
 ('Finance & Fintech','finance-fintech'),('Fitness & Wellness','fitness-wellness'),('Food & Beverage','food-beverage'),('Healthcare','healthcare'),
 ('Hospitality & Travel','hospitality-travel'),('Legal','legal'),('Logistics','logistics'),('Media & Publishing','media-publishing'),
 ('Non-profit','non-profit'),('Real Estate','real-estate'),('SaaS & Software','saas-software'),('Professional Services','professional-services')
ON CONFLICT (slug) DO NOTHING;

-- Adds an industry if it's new, returns its name. Used when owners or AI name an industry.
CREATE OR REPLACE FUNCTION public.ensure_industry(_name text, _by_ai boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _clean text := left(initcap(trim(_name)), 60); _slug text;
BEGIN
  IF auth.uid() IS NULL AND current_user <> 'service_role' THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF coalesce(_clean,'') = '' THEN RETURN NULL; END IF;
  _slug := trim(both '-' from regexp_replace(lower(_clean), '[^a-z0-9]+', '-', 'g'));
  INSERT INTO industries(name, slug, created_by_ai) VALUES (_clean, _slug, _by_ai) ON CONFLICT (slug) DO NOTHING;
  RETURN (SELECT name FROM industries WHERE slug = _slug);
END $$;
REVOKE EXECUTE ON FUNCTION public.ensure_industry(text, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ensure_industry(text, boolean) TO authenticated, service_role;

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS favicon_url text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_profile jsonb NOT NULL DEFAULT '{}'::jsonb;