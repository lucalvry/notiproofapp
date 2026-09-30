-- Part 1: Add soft delete column to websites table
ALTER TABLE public.websites 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient querying of non-deleted websites
CREATE INDEX IF NOT EXISTS idx_websites_deleted_at ON public.websites(deleted_at) WHERE deleted_at IS NULL;

-- Part 3: Change testimonials foreign key from CASCADE to SET NULL
-- First, drop the existing constraint
ALTER TABLE public.testimonials 
DROP CONSTRAINT IF EXISTS testimonials_website_id_fkey;

-- Re-add with SET NULL behavior
ALTER TABLE public.testimonials 
ADD CONSTRAINT testimonials_website_id_fkey 
FOREIGN KEY (website_id) 
REFERENCES public.websites(id) 
ON DELETE SET NULL;

-- Make website_id nullable in testimonials to support SET NULL
ALTER TABLE public.testimonials 
ALTER COLUMN website_id DROP NOT NULL;

-- Update RLS policies for websites to hide soft-deleted ones from regular users
DROP POLICY IF EXISTS "Users can view their own websites" ON public.websites;
CREATE POLICY "Users can view their own websites" 
ON public.websites 
FOR SELECT 
USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view their own active websites" ON public.websites;
CREATE POLICY "Users can view their own active websites" 
ON public.websites 
FOR SELECT 
USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Admin policy to see all websites including deleted
DROP POLICY IF EXISTS "Admins can view all websites" ON public.websites;
CREATE POLICY "Admins can view all websites" 
ON public.websites 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Policy for users to view their archived websites (for restore functionality)
CREATE POLICY "Users can view their archived websites" 
ON public.websites 
FOR SELECT 
USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- Update policy for soft deleting (updating deleted_at)
DROP POLICY IF EXISTS "Users can update their own websites" ON public.websites;
CREATE POLICY "Users can update their own websites" 
ON public.websites 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to get website deletion impact
CREATE OR REPLACE FUNCTION public.get_website_deletion_impact(_website_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  testimonial_count INTEGER;
  campaign_count INTEGER;
  widget_count INTEGER;
  event_count INTEGER;
  integration_count INTEGER;
BEGIN
  -- Count testimonials
  SELECT COUNT(*) INTO testimonial_count
  FROM testimonials WHERE website_id = _website_id;
  
  -- Count campaigns
  SELECT COUNT(*) INTO campaign_count
  FROM campaigns WHERE website_id = _website_id;
  
  -- Count widgets
  SELECT COUNT(*) INTO widget_count
  FROM widgets WHERE website_id = _website_id;
  
  -- Count events (through widgets)
  SELECT COUNT(*) INTO event_count
  FROM events e
  JOIN widgets w ON w.id = e.widget_id
  WHERE w.website_id = _website_id;
  
  -- Count integrations
  SELECT COUNT(*) INTO integration_count
  FROM integrations WHERE website_id = _website_id;
  
  RETURN jsonb_build_object(
    'testimonials', testimonial_count,
    'campaigns', campaign_count,
    'widgets', widget_count,
    'events', event_count,
    'integrations', integration_count
  );
END;
$$;

-- Create function to soft delete a website
CREATE OR REPLACE FUNCTION public.soft_delete_website(_website_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE websites 
  SET deleted_at = NOW()
  WHERE id = _website_id 
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Create function to restore a soft-deleted website
CREATE OR REPLACE FUNCTION public.restore_website(_website_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE websites 
  SET deleted_at = NULL
  WHERE id = _website_id 
    AND user_id = auth.uid()
    AND deleted_at IS NOT NULL;
  
  RETURN FOUND;
END;
$$;

-- Create function to permanently delete old archived websites (30+ days)
CREATE OR REPLACE FUNCTION public.purge_old_deleted_websites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM websites 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;