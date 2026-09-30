-- Phase 3.2: Fix RLS Policies for Public Testimonial Submissions

-- Drop existing conflicting policies if any
DROP POLICY IF EXISTS "Public can submit to active forms" ON public.testimonials;
DROP POLICY IF EXISTS "Users can view their testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Users can update their testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can view all testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can update all testimonials" ON public.testimonials;

-- Enable RLS on testimonials table
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Allow public/anonymous users to submit testimonials to active forms
-- This is the CRITICAL policy for form submissions to work
CREATE POLICY "Public can submit to active forms"
ON public.testimonials 
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Check if the form exists and is active
  EXISTS (
    SELECT 1 
    FROM public.testimonial_forms tf
    WHERE tf.id = (testimonials.metadata->>'form_id')::uuid
    AND tf.is_active = true
  )
);

-- Allow users to view testimonials for their websites
CREATE POLICY "Website owners can view their testimonials"
ON public.testimonials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.websites w
    WHERE w.id = testimonials.website_id
    AND w.user_id = auth.uid()
  )
);

-- Allow users to update testimonials for their websites (for moderation)
CREATE POLICY "Website owners can update their testimonials"
ON public.testimonials
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.websites w
    WHERE w.id = testimonials.website_id
    AND w.user_id = auth.uid()
  )
);

-- Allow users to delete testimonials for their websites
CREATE POLICY "Website owners can delete their testimonials"
ON public.testimonials
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.websites w
    WHERE w.id = testimonials.website_id
    AND w.user_id = auth.uid()
  )
);

-- Allow admins to view all testimonials
CREATE POLICY "Admins can view all testimonials"
ON public.testimonials
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Allow admins to update all testimonials
CREATE POLICY "Admins can update all testimonials"
ON public.testimonials
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Phase 3.3: Fix Storage Bucket Permissions for Anonymous Uploads

-- Update testimonials bucket to allow public access
UPDATE storage.buckets
SET public = true
WHERE id = 'testimonials';

-- Drop existing storage policies to recreate them properly
DROP POLICY IF EXISTS "Public can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload avatars and videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view testimonial files" ON storage.objects;
DROP POLICY IF EXISTS "Website owners can delete their files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all testimonial files" ON storage.objects;

-- Allow anonymous users to upload avatars and videos to the testimonials bucket
-- This follows the folder structure: {website_id}/avatars/ and {website_id}/videos/
CREATE POLICY "Public can upload avatars and videos"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'testimonials' AND
  (
    -- Allow uploads to avatars folder (check if path contains /avatars/)
    name LIKE '%/avatars/%' OR
    -- Allow uploads to videos folder (check if path contains /videos/)
    name LIKE '%/videos/%'
  )
);

-- Allow anyone to view files in the testimonials bucket (it's public)
CREATE POLICY "Anyone can view testimonial files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'testimonials');

-- Allow website owners to delete their testimonial files
-- Match folder path pattern: {website_id}/avatars/* or {website_id}/videos/*
CREATE POLICY "Website owners can delete their files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'testimonials' AND
  EXISTS (
    SELECT 1 
    FROM public.websites w
    WHERE w.user_id = auth.uid()
    -- Check if the file path starts with the website_id
    AND name LIKE w.id::text || '/%'
  )
);

-- Allow admins to manage all storage objects
CREATE POLICY "Admins can manage all testimonial files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'testimonials' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);