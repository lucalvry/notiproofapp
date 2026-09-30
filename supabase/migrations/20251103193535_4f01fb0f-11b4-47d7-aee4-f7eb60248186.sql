-- Add new columns to integrations_config for OAuth specifications
ALTER TABLE integrations_config 
ADD COLUMN IF NOT EXISTS oauth_spec JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS requires_admin_credentials BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS setup_instructions TEXT;

-- Populate oauth_spec for GA4
UPDATE integrations_config 
SET 
  oauth_spec = jsonb_build_object(
    'authorization_url', 'https://accounts.google.com/o/oauth2/v2/auth',
    'token_url', 'https://oauth2.googleapis.com/token',
    'required_scopes', jsonb_build_array(
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics.manage.users.readonly'
    ),
    'scope_separator', ' ',
    'access_type', 'offline',
    'prompt', 'consent',
    'response_type', 'code'
  ),
  requires_admin_credentials = true,
  setup_instructions = E'1. Go to Google Cloud Console (console.cloud.google.com)\n2. Create a new project or select an existing one\n3. Enable "Google Analytics Data API v1"\n4. Navigate to APIs & Services → Credentials\n5. Click Create Credentials → OAuth 2.0 Client ID\n6. Select Web application\n7. Add authorized redirect URI from NotiProof\n8. Copy Client ID and Client Secret below'
WHERE integration_type = 'ga4';

-- Populate oauth_spec for Instagram
UPDATE integrations_config 
SET 
  oauth_spec = jsonb_build_object(
    'authorization_url', 'https://api.instagram.com/oauth/authorize',
    'token_url', 'https://api.instagram.com/oauth/access_token',
    'required_scopes', jsonb_build_array('user_profile', 'user_media'),
    'scope_separator', ',',
    'response_type', 'code',
    'exchange_long_lived_token', true
  ),
  requires_admin_credentials = true,
  setup_instructions = E'1. Go to Meta for Developers (developers.facebook.com)\n2. Create or select an app\n3. Add Instagram Basic Display product\n4. Configure OAuth Redirect URIs\n5. Copy App ID and App Secret below'
WHERE integration_type = 'instagram';

-- Populate oauth_spec for Google Reviews
UPDATE integrations_config 
SET 
  oauth_spec = jsonb_build_object(
    'authorization_url', 'https://accounts.google.com/o/oauth2/v2/auth',
    'token_url', 'https://oauth2.googleapis.com/token',
    'required_scopes', jsonb_build_array('https://www.googleapis.com/auth/business.manage'),
    'scope_separator', ' ',
    'access_type', 'offline',
    'prompt', 'consent',
    'response_type', 'code'
  ),
  requires_admin_credentials = true,
  setup_instructions = E'1. Go to Google Cloud Console (console.cloud.google.com)\n2. Enable "Google My Business API"\n3. Create OAuth 2.0 Client ID\n4. Add authorized redirect URI\n5. Copy Client ID and Client Secret below'
WHERE integration_type = 'google_reviews';

-- Mark other OAuth integrations as requiring admin credentials
UPDATE integrations_config 
SET requires_admin_credentials = true
WHERE requires_oauth = true AND oauth_spec = '{}'::jsonb;

-- Add index for performance on oauth_spec queries
CREATE INDEX IF NOT EXISTS idx_integrations_config_oauth_spec 
ON integrations_config USING gin(oauth_spec);

-- Add index for requires_admin_credentials lookups
CREATE INDEX IF NOT EXISTS idx_integrations_config_requires_admin 
ON integrations_config(requires_admin_credentials) 
WHERE requires_admin_credentials = true;