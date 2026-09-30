-- Add feature_flags column to widgets table
ALTER TABLE widgets ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT jsonb_build_object(
  'showProductImages', true,
  'linkifyProducts', true,
  'fallbackIcon', 'default',
  'version', 2
);

-- Update existing widgets to enable new features by default
UPDATE widgets 
SET feature_flags = jsonb_build_object(
  'showProductImages', true,
  'linkifyProducts', true,
  'fallbackIcon', 'default',
  'version', 2
)
WHERE feature_flags IS NULL OR feature_flags = '{}'::jsonb;