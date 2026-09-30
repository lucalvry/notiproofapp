-- ============================================
-- ADD FORM VIEW TRACKING
-- ============================================

-- Add view_count column to testimonial_forms
ALTER TABLE public.testimonial_forms 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create function to increment form views (security definer for public access)
CREATE OR REPLACE FUNCTION public.increment_form_views(form_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.testimonial_forms
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE slug = form_slug AND is_active = true;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.increment_form_views(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_form_views(TEXT) TO authenticated;

COMMENT ON FUNCTION public.increment_form_views IS 'Increments view count for testimonial collection forms. Public access allowed for form tracking.';