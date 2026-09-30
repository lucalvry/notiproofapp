-- Phase 2: Database Setup for Testimonial Forms
-- Create testimonial_forms table and add form_id to testimonials

-- Create testimonial_forms table
CREATE TABLE IF NOT EXISTS public.testimonial_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  welcome_message TEXT,
  thank_you_message TEXT,
  form_config JSONB NOT NULL DEFAULT '{
    "fields": {
      "name": {"enabled": true, "required": true},
      "email": {"enabled": true, "required": false},
      "rating": {"enabled": true, "required": true},
      "message": {"enabled": true, "required": true},
      "image": {"enabled": true, "required": false},
      "video": {"enabled": false, "required": false}
    }
  }'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add form_id column to testimonials table
ALTER TABLE public.testimonials 
ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES public.testimonial_forms(id) ON DELETE SET NULL;

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_testimonial_forms_slug ON public.testimonial_forms(slug);

-- Create index on website_id for filtering
CREATE INDEX IF NOT EXISTS idx_testimonial_forms_website_id ON public.testimonial_forms(website_id);

-- Create index on form_id in testimonials table
CREATE INDEX IF NOT EXISTS idx_testimonials_form_id ON public.testimonials(form_id);

-- Enable RLS on testimonial_forms
ALTER TABLE public.testimonial_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own testimonial forms
CREATE POLICY "Users can view their own testimonial forms"
ON public.testimonial_forms
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policy: Users can create testimonial forms
CREATE POLICY "Users can create testimonial forms"
ON public.testimonial_forms
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can update their own testimonial forms
CREATE POLICY "Users can update their own testimonial forms"
ON public.testimonial_forms
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can delete their own testimonial forms
CREATE POLICY "Users can delete their own testimonial forms"
ON public.testimonial_forms
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policy: Public can view active testimonial forms (for submission page)
CREATE POLICY "Public can view active testimonial forms"
ON public.testimonial_forms
FOR SELECT
TO anon
USING (is_active = true);

-- Update testimonials RLS to allow public submissions to active forms
CREATE POLICY "Public can submit testimonials to active forms"
ON public.testimonials
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.testimonial_forms tf
    WHERE tf.id = testimonials.form_id
    AND tf.is_active = true
  )
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_testimonial_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_testimonial_forms_updated_at
BEFORE UPDATE ON public.testimonial_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_testimonial_forms_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.testimonial_forms IS 'Stores testimonial collection form configurations';
COMMENT ON COLUMN public.testimonial_forms.slug IS 'Unique slug for the public collection form URL';
COMMENT ON COLUMN public.testimonial_forms.form_config IS 'JSON configuration for form fields and validation rules';
COMMENT ON COLUMN public.testimonials.form_id IS 'References the form used to collect this testimonial';