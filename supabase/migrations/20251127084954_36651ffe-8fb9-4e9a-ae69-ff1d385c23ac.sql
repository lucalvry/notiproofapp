-- Fix RLS policy for testimonial form submissions
-- Allow authenticated users to view active forms for submission purposes

CREATE POLICY "Authenticated users can view active forms for submission"
  ON public.testimonial_forms
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Update existing forms to include 'message' page in their sequence
-- For saas template
UPDATE public.testimonial_forms
SET pages_config = jsonb_set(
  pages_config,
  '{sequence}',
  '["rating", "welcome", "q1", "q2", "q3", "q4", "message", "about_you", "about_company", "thank_you"]'::jsonb
)
WHERE form_type = 'saas'
  AND NOT (pages_config->'sequence')::jsonb ? 'message';

-- For sponsor template
UPDATE public.testimonial_forms
SET pages_config = jsonb_set(
  pages_config,
  '{sequence}',
  '["rating", "welcome", "q1", "q2", "q3", "message", "about_you", "about_company", "thank_you"]'::jsonb
)
WHERE form_type = 'sponsor'
  AND NOT (pages_config->'sequence')::jsonb ? 'message';

-- For course template
UPDATE public.testimonial_forms
SET pages_config = jsonb_set(
  pages_config,
  '{sequence}',
  '["rating", "welcome", "q1", "q2", "q3", "q4", "q5", "message", "about_you", "about_company", "thank_you"]'::jsonb
)
WHERE form_type = 'course'
  AND NOT (pages_config->'sequence')::jsonb ? 'message';