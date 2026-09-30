-- Public storage bucket for collected testimonial videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('testimonials', 'testimonials', true)
ON CONFLICT (id) DO NOTHING;

-- Public read of testimonial media (videos shown in widgets)
DROP POLICY IF EXISTS "Public read testimonials" ON storage.objects;
CREATE POLICY "Public read testimonials"
ON storage.objects
FOR SELECT
USING (bucket_id = 'testimonials');

-- Public write — collection page is unauthenticated. Edge function `submit-testimonial`
-- is the canonical writer (service role) but we also allow anon inserts so the browser
-- can upload directly when the network path is short.
DROP POLICY IF EXISTS "Public upload testimonials" ON storage.objects;
CREATE POLICY "Public upload testimonials"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'testimonials');

-- Helper RPC for the Collect page: resolves the business name + brand for a token,
-- without exposing the rest of the testimonial_requests row.
CREATE OR REPLACE FUNCTION public.get_collection_context(_token text)
RETURNS TABLE (
  recipient_name text,
  business_name text,
  business_logo_url text,
  brand_color text,
  status testimonial_request_status,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tr.recipient_name,
    b.name AS business_name,
    b.logo_url AS business_logo_url,
    COALESCE(b.settings->>'brand_color', NULL) AS brand_color,
    tr.status,
    tr.expires_at
  FROM public.testimonial_requests tr
  JOIN public.businesses b ON b.id = tr.business_id
  WHERE tr.token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_collection_context(text) TO anon, authenticated;