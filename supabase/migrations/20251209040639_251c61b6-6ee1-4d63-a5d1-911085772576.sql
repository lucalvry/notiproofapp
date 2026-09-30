-- Create a storage bucket for widget assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('widget-assets', 'widget-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to widget assets
CREATE POLICY "Public read access for widget assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'widget-assets');

-- Allow authenticated admins to upload widget assets
CREATE POLICY "Admin upload access for widget assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'widget-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  )
);

-- Allow authenticated admins to update widget assets
CREATE POLICY "Admin update access for widget assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'widget-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  )
);

-- Allow authenticated admins to delete widget assets
CREATE POLICY "Admin delete access for widget assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'widget-assets' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  )
);