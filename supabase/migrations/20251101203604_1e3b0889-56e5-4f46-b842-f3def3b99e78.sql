-- Add white-label settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS white_label_settings JSONB DEFAULT '{
  "enabled": false,
  "hide_branding": false,
  "custom_logo_url": "",
  "custom_colors": {
    "primary": "#667eea",
    "secondary": "#764ba2"
  },
  "custom_domain": "",
  "custom_brand_name": ""
}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.profiles.white_label_settings IS 'White-label customization settings for Pro+ users';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_white_label_enabled 
ON public.profiles ((white_label_settings->>'enabled'));
