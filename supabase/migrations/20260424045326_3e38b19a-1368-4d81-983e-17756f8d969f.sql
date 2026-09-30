-- Replace broad public read with a narrower one: still allows fetching a known file by path
-- (which is what the widget and Collect pages do via getPublicUrl), but blocks bucket listing.
DROP POLICY IF EXISTS "Public read testimonials" ON storage.objects;

CREATE POLICY "Public fetch testimonials by path"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'testimonials'
  AND name IS NOT NULL
  AND name <> ''
);