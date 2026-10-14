CREATE OR REPLACE FUNCTION public.fill_business_website_from_domain()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.businesses SET website_url = 'https://' || NEW.domain
  WHERE id = NEW.business_id AND (website_url IS NULL OR website_url = '');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_fill_business_website ON public.business_domains;
CREATE TRIGGER trg_fill_business_website AFTER INSERT ON public.business_domains
FOR EACH ROW EXECUTE FUNCTION public.fill_business_website_from_domain();