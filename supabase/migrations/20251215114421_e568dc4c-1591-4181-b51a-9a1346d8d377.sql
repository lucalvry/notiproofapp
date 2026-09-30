-- Add design_defaults column to integrations table (for native integrations)
ALTER TABLE integrations 
ADD COLUMN IF NOT EXISTS design_defaults JSONB DEFAULT '{}'::jsonb;

-- Add design_defaults column to integration_connectors table (for webhook/API integrations)
ALTER TABLE integration_connectors 
ADD COLUMN IF NOT EXISTS design_defaults JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN integrations.design_defaults IS 'Default design settings for notifications created from this integration';
COMMENT ON COLUMN integration_connectors.design_defaults IS 'Default design settings for notifications created from this integration connector';