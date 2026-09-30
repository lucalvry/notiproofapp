
-- Fix RLS policies for testimonial submissions
-- The issue is that policies are inconsistent between checking form_id column vs metadata

-- Drop conflicting policies
DROP POLICY IF EXISTS "Public can submit testimonials to active forms" ON testimonials;
DROP POLICY IF EXISTS "Public can submit to active forms" ON testimonials;
DROP POLICY IF EXISTS "Public can submit testimonials" ON testimonials;

-- Create a unified policy that allows both anonymous and authenticated users to submit
-- via forms, as long as the form is active
CREATE POLICY "Anyone can submit testimonials to active forms"
ON testimonials
FOR INSERT
TO anon, authenticated
WITH CHECK (
  source IN ('form', 'link', 'qr')
  AND EXISTS (
    SELECT 1 FROM testimonial_forms tf
    WHERE tf.id = testimonials.form_id
    AND tf.is_active = true
  )
);

-- Add helpful comment
COMMENT ON POLICY "Anyone can submit testimonials to active forms" ON testimonials 
IS 'Allows both anonymous and authenticated users to submit testimonials through active forms. Checks form_id column directly.';