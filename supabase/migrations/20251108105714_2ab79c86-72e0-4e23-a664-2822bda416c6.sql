-- Add integration_settings column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS integration_settings JSONB DEFAULT '{
  "image_fallback_url": "",
  "locale": "en",
  "actions": []
}'::jsonb;

-- Add integration_settings column to widgets table
ALTER TABLE widgets 
ADD COLUMN IF NOT EXISTS integration_settings JSONB DEFAULT '{
  "image_fallback_url": "",
  "locale": "en",
  "show_product_images": true,
  "linkify_products": true
}'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_campaigns_integration_settings 
ON campaigns USING gin (integration_settings);

-- Add comment
COMMENT ON COLUMN campaigns.integration_settings IS 'Integration-specific configuration: image fallback, locale, action rules';
COMMENT ON COLUMN widgets.integration_settings IS 'Widget-specific integration settings: images, locale, product display options';