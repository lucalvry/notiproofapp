
-- Phase 3: Rename data_sources_v2 to data_sources and drop legacy data_source column

BEGIN;

-- Step 1: Add new data_sources column if it doesn't exist
ALTER TABLE campaigns 
  ADD COLUMN IF NOT EXISTS data_sources JSONB DEFAULT '[]'::jsonb;

-- Step 2: Copy data from data_sources_v2 to data_sources
UPDATE campaigns 
  SET data_sources = COALESCE(data_sources_v2, '[]'::jsonb)
  WHERE data_sources_v2 IS NOT NULL;

-- Step 3: For campaigns with no data_sources_v2 but have legacy data_source, preserve in new format
UPDATE campaigns 
  SET data_sources = jsonb_build_array(
    jsonb_build_object(
      'provider', data_source,
      'legacy', true
    )
  )
  WHERE (data_sources IS NULL OR data_sources = '[]'::jsonb)
    AND data_source IS NOT NULL 
    AND data_source != ''
    AND data_source != 'manual';

-- Step 4: Drop old columns
ALTER TABLE campaigns DROP COLUMN IF EXISTS data_source;
ALTER TABLE campaigns DROP COLUMN IF EXISTS data_sources_v2;

-- Step 5: Add comment to new column
COMMENT ON COLUMN campaigns.data_sources IS 'Array of integration sources: [{integration_id, provider, adapter_config, filters}]';

COMMIT;
