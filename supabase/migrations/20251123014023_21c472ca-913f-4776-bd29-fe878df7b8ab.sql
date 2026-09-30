
-- Fix RLS policy conflict for testimonial submissions
-- The issue: authenticated users are blocked by the "Users can create testimonials for their websites" policy
-- when they try to submit forms they don't own

-- Drop the overly broad policy
DROP POLICY IF EXISTS "Users can create testimonials for their websites" ON testimonials;

-- Replace it with a more specific policy that only applies when NOT submitting via form
CREATE POLICY "Website owners can create manual testimonials"
ON testimonials
FOR INSERT
TO authenticated
WITH CHECK (
  source NOT IN ('form', 'link', 'qr')
  AND EXISTS (
    SELECT 1 FROM websites w
    WHERE w.id = testimonials.website_id
    AND w.user_id = auth.uid()
  )
);

COMMENT ON POLICY "Website owners can create manual testimonials" ON testimonials 
IS 'Allows website owners to manually create testimonials (not via forms). Form submissions use the separate "Anyone can submit" policy.';