-- Add default_rules column to website_settings table to store global targeting rules

ALTER TABLE website_settings 
ADD COLUMN IF NOT EXISTS default_rules jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN website_settings.default_rules IS 'Global targeting rules that apply as defaults to all new campaigns for this website';