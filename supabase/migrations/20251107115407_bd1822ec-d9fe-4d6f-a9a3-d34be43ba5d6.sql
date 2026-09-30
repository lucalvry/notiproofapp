-- Step 1: Add website_id and data_source columns to campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS website_id UUID,
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';

-- Step 2: Backfill website_id for existing campaigns using their user's first website
UPDATE campaigns c
SET website_id = (
  SELECT w.id 
  FROM websites w 
  WHERE w.user_id = c.user_id 
  ORDER BY w.created_at ASC 
  LIMIT 1
)
WHERE website_id IS NULL;

-- Step 3: Make website_id NOT NULL and add foreign key
ALTER TABLE campaigns 
ALTER COLUMN website_id SET NOT NULL;

ALTER TABLE campaigns
ADD CONSTRAINT campaigns_website_id_fkey 
FOREIGN KEY (website_id) 
REFERENCES websites(id) 
ON DELETE CASCADE;

-- Step 4: Add index for polling queries
CREATE INDEX IF NOT EXISTS idx_campaigns_polling 
ON campaigns(status, website_id) 
WHERE polling_config->>'enabled' = 'true';

-- Step 5: Create function to poll active campaigns
CREATE OR REPLACE FUNCTION poll_active_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  campaign_record RECORD;
  polling_config JSONB;
  last_poll TIMESTAMP WITH TIME ZONE;
  interval_minutes INTEGER;
  next_poll_time TIMESTAMP WITH TIME ZONE;
  sync_result JSONB;
BEGIN
  -- Loop through all active campaigns with polling enabled
  FOR campaign_record IN
    SELECT 
      c.id,
      c.user_id,
      c.website_id,
      c.polling_config,
      c.data_source
    FROM campaigns c
    WHERE c.status = 'active'
      AND c.data_source = 'ga4'
      AND (c.polling_config->>'enabled')::boolean = true
  LOOP
    -- Get polling configuration
    polling_config := campaign_record.polling_config;
    last_poll := (polling_config->>'last_poll_at')::timestamp with time zone;
    interval_minutes := COALESCE((polling_config->>'interval_minutes')::integer, 5);
    
    -- Calculate next poll time
    IF last_poll IS NULL THEN
      next_poll_time := NOW() - INTERVAL '1 minute'; -- Poll immediately if never polled
    ELSE
      next_poll_time := last_poll + (interval_minutes || ' minutes')::interval;
    END IF;
    
    -- Check if it's time to poll
    IF NOW() >= next_poll_time THEN
      -- Log the polling attempt
      RAISE NOTICE 'Polling campaign % for user %', campaign_record.id, campaign_record.user_id;
      
      -- Note: The actual HTTP call to sync-ga4 edge function will be done via pg_net
      -- in the cron job setup, not here to avoid timing out this function
    END IF;
  END LOOP;
END;
$$;

-- Step 6: Create helper function to get campaigns due for polling
CREATE OR REPLACE FUNCTION get_campaigns_due_for_polling()
RETURNS TABLE(
  campaign_id UUID,
  user_id UUID,
  website_id UUID,
  interval_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.user_id,
    c.website_id,
    COALESCE((c.polling_config->>'interval_minutes')::integer, 5) as interval_minutes
  FROM campaigns c
  WHERE c.status = 'active'
    AND c.data_source = 'ga4'
    AND (c.polling_config->>'enabled')::boolean = true
    AND (
      (c.polling_config->>'last_poll_at') IS NULL
      OR (c.polling_config->>'last_poll_at')::timestamp with time zone + 
         (COALESCE((c.polling_config->>'interval_minutes')::integer, 5) || ' minutes')::interval <= NOW()
    );
END;
$$;