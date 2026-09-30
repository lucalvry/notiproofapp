-- Add external_id to events table (for deduplication)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_external_id 
ON events(external_id) 
WHERE external_id IS NOT NULL;

-- Add unique constraint to prevent duplicate external events
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_external_id_unique
ON events(integration_type, external_id)
WHERE external_id IS NOT NULL;

COMMENT ON COLUMN events.external_id IS 'Unique ID from source system (e.g., Shopify order ID, Stripe payment ID)';

-- Add sync tracking columns to integration_connectors
ALTER TABLE integration_connectors
ADD COLUMN IF NOT EXISTS sync_frequency_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_sync_status JSONB DEFAULT '{"success": true, "events_synced": 0}'::jsonb;

COMMENT ON COLUMN integration_connectors.sync_frequency_minutes IS 'How often to auto-sync (0 = webhook only)';
COMMENT ON COLUMN integration_connectors.auto_sync_enabled IS 'Enable automatic background sync';
COMMENT ON COLUMN integration_connectors.last_sync_status IS 'Status of the last sync operation';