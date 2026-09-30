-- Fix get_campaigns_due_for_polling function to use data_sources column

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_campaigns_due_for_polling();

-- Recreate with updated query using data_sources instead of data_source
CREATE OR REPLACE FUNCTION get_campaigns_due_for_polling()
RETURNS TABLE(
  campaign_id UUID,
  user_id UUID,
  website_id UUID,
  polling_config JSONB
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.user_id,
    c.website_id,
    c.polling_config
  FROM campaigns c
  WHERE c.status = 'active'
    -- Check if data_sources array contains a GA4 provider
    AND EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(c.data_sources) AS source
      WHERE source->>'provider' = 'ga4'
    )
    AND (c.polling_config->>'enabled')::boolean = true
    AND (
      (c.polling_config->>'last_poll_at') IS NULL
      OR (c.polling_config->>'last_poll_at')::timestamp with time zone + 
         (COALESCE((c.polling_config->>'interval_minutes')::integer, 5) || ' minutes')::interval < NOW()
    );
END;
$$;