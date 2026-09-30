-- Create storage bucket for testimonial media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'testimonials',
  'testimonials',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
);

-- Create RLS policies for testimonial media storage
CREATE POLICY "Anyone can view testimonial media"
ON storage.objects FOR SELECT
USING (bucket_id = 'testimonials');

CREATE POLICY "Authenticated users can upload testimonial media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'testimonials' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own testimonial media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'testimonials' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own testimonial media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'testimonials' 
  AND auth.uid() IS NOT NULL
);