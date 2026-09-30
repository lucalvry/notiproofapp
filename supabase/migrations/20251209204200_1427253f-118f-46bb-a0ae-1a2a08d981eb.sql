-- Add deletion tracking to media table
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS testimonial_id UUID REFERENCES public.testimonials(id) ON DELETE SET NULL;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_media_deleted_at ON public.media(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_website_id ON public.media(website_id);
CREATE INDEX IF NOT EXISTS idx_media_testimonial_id ON public.media(testimonial_id);

-- Function to get all media for a website (including orphaned testimonial media)
CREATE OR REPLACE FUNCTION public.get_website_media(_website_id uuid)
RETURNS TABLE (
  id uuid,
  cdn_url text,
  file_size bigint,
  type text,
  testimonial_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.cdn_url, m.file_size, m.type, m.testimonial_id, m.created_at
  FROM media m
  WHERE m.website_id = _website_id
    AND m.deleted_at IS NULL
  UNION
  SELECT m.id, m.cdn_url, m.file_size, m.type, m.testimonial_id, m.created_at
  FROM media m
  JOIN testimonials t ON m.testimonial_id = t.id
  WHERE t.website_id = _website_id
    AND m.deleted_at IS NULL;
END;
$$;

-- Function to mark website media for deletion (called when website is archived)
CREATE OR REPLACE FUNCTION public.mark_website_media_for_deletion(_website_id uuid)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  count1 INTEGER;
  count2 INTEGER;
BEGIN
  -- Mark direct website media
  UPDATE media
  SET deleted_at = NOW()
  WHERE website_id = _website_id
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS count1 = ROW_COUNT;
  
  -- Mark media linked to testimonials of this website
  UPDATE media m
  SET deleted_at = NOW()
  FROM testimonials t
  WHERE m.testimonial_id = t.id
    AND t.website_id = _website_id
    AND m.deleted_at IS NULL;
  
  GET DIAGNOSTICS count2 = ROW_COUNT;
  
  RETURN count1 + count2;
END;
$$;

-- Function to get media pending cleanup (older than 30 days)
CREATE OR REPLACE FUNCTION public.get_media_pending_cleanup(_days_threshold integer DEFAULT 30)
RETURNS TABLE (
  id uuid,
  cdn_url text,
  file_size bigint,
  user_id uuid,
  website_id uuid,
  deleted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.cdn_url, m.file_size, m.user_id, m.website_id, m.deleted_at
  FROM media m
  WHERE m.deleted_at IS NOT NULL
    AND m.deleted_at < NOW() - (_days_threshold || ' days')::interval;
END;
$$;

-- Function to get orphaned media (no website or testimonial)
CREATE OR REPLACE FUNCTION public.get_orphaned_media()
RETURNS TABLE (
  id uuid,
  cdn_url text,
  file_size bigint,
  user_id uuid,
  type text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.cdn_url, m.file_size, m.user_id, m.type, m.created_at
  FROM media m
  WHERE m.website_id IS NULL
    AND m.testimonial_id IS NULL
    AND m.deleted_at IS NULL;
END;
$$;

-- Function to permanently delete media records after CDN cleanup
CREATE OR REPLACE FUNCTION public.purge_deleted_media(_media_ids uuid[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM media
  WHERE id = ANY(_media_ids);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to get media storage impact for a website
CREATE OR REPLACE FUNCTION public.get_website_media_impact(_website_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  media_count INTEGER;
  total_size BIGINT;
BEGIN
  SELECT 
    COUNT(*),
    COALESCE(SUM(file_size), 0)
  INTO media_count, total_size
  FROM (
    SELECT m.file_size
    FROM media m
    WHERE m.website_id = _website_id AND m.deleted_at IS NULL
    UNION ALL
    SELECT m.file_size
    FROM media m
    JOIN testimonials t ON m.testimonial_id = t.id
    WHERE t.website_id = _website_id AND m.deleted_at IS NULL
  ) subq;
  
  RETURN jsonb_build_object(
    'media_count', media_count,
    'total_bytes', total_size
  );
END;
$$;

-- Update soft_delete_website to also mark media for deletion
CREATE OR REPLACE FUNCTION public.soft_delete_website(_website_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  media_marked INTEGER;
BEGIN
  -- Soft delete the website
  UPDATE websites 
  SET deleted_at = NOW()
  WHERE id = _website_id 
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Mark associated media for deletion
  SELECT mark_website_media_for_deletion(_website_id) INTO media_marked;
  
  RETURN TRUE;
END;
$$;

-- Update restore_website to also unmark media for deletion
CREATE OR REPLACE FUNCTION public.restore_website(_website_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Restore the website
  UPDATE websites 
  SET deleted_at = NULL
  WHERE id = _website_id 
    AND user_id = auth.uid()
    AND deleted_at IS NOT NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Unmark associated media
  UPDATE media
  SET deleted_at = NULL
  WHERE website_id = _website_id;
  
  UPDATE media m
  SET deleted_at = NULL
  FROM testimonials t
  WHERE m.testimonial_id = t.id
    AND t.website_id = _website_id;
  
  RETURN TRUE;
END;
$$;