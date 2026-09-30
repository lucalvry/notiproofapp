-- Add OAuth specifications for integrations missing them
-- This enables validation and standardizes OAuth configuration

-- Mailchimp OAuth spec
UPDATE integrations_config
SET oauth_spec = jsonb_build_object(
  'authorization_url', 'https://login.mailchimp.com/oauth2/authorize',
  'token_url', 'https://login.mailchimp.com/oauth2/token',
  'required_scopes', '[]'::jsonb,
  'scope_separator', ' ',
  'response_type', 'code'
)
WHERE integration_type = 'mailchimp';

-- HubSpot OAuth spec
UPDATE integrations_config
SET oauth_spec = jsonb_build_object(
  'authorization_url', 'https://app.hubspot.com/oauth/authorize',
  'token_url', 'https://api.hubapi.com/oauth/v1/token',
  'required_scopes', jsonb_build_array('contacts', 'crm.objects.contacts.read'),
  'scope_separator', ' ',
  'response_type', 'code'
)
WHERE integration_type = 'hubspot';

-- Salesforce OAuth spec
UPDATE integrations_config
SET oauth_spec = jsonb_build_object(
  'authorization_url', 'https://login.salesforce.com/services/oauth2/authorize',
  'token_url', 'https://login.salesforce.com/services/oauth2/token',
  'required_scopes', jsonb_build_array('api', 'refresh_token'),
  'scope_separator', ' ',
  'response_type', 'code'
)
WHERE integration_type = 'salesforce';

-- Intercom OAuth spec
UPDATE integrations_config
SET oauth_spec = jsonb_build_object(
  'authorization_url', 'https://app.intercom.com/oauth',
  'token_url', 'https://api.intercom.io/auth/eagle/token',
  'required_scopes', '[]'::jsonb,
  'scope_separator', ' ',
  'response_type', 'code'
)
WHERE integration_type = 'intercom';

-- Spotify OAuth spec
UPDATE integrations_config
SET oauth_spec = jsonb_build_object(
  'authorization_url', 'https://accounts.spotify.com/authorize',
  'token_url', 'https://accounts.spotify.com/api/token',
  'required_scopes', jsonb_build_array('user-read-recently-played', 'user-top-read'),
  'scope_separator', ' ',
  'response_type', 'code'
)
WHERE integration_type = 'spotify';

-- Twitter OAuth spec (OAuth 2.0 with PKCE)
UPDATE integrations_config
SET oauth_spec = jsonb_build_object(
  'authorization_url', 'https://twitter.com/i/oauth2/authorize',
  'token_url', 'https://api.twitter.com/2/oauth2/token',
  'required_scopes', jsonb_build_array('tweet.read', 'users.read', 'offline.access'),
  'scope_separator', ' ',
  'response_type', 'code'
)
WHERE integration_type = 'twitter';