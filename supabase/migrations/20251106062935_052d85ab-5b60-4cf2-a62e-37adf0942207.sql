-- Fix GA4 OAuth scopes to include Admin API access
UPDATE integrations_config
SET 
  oauth_spec = jsonb_set(
    oauth_spec,
    '{required_scopes}',
    '["https://www.googleapis.com/auth/analytics.readonly", "https://www.googleapis.com/auth/analytics.edit"]'::jsonb
  ),
  setup_instructions = E'# Google Analytics 4 Setup\n\n## Step 1: Enable Required APIs\n1. Go to [Google Cloud Console](https://console.cloud.google.com)\n2. Select your project or create a new one\n3. Enable these APIs:\n   - **Google Analytics Data API v1**\n   - **Google Analytics Admin API v1** (Required to list properties)\n\n## Step 2: Create OAuth Credentials\n1. Navigate to "APIs & Services" → "Credentials"\n2. Click "Create Credentials" → "OAuth 2.0 Client ID"\n3. Select "Web application" as application type\n4. Add the authorized redirect URI shown in the admin panel\n5. Copy the Client ID and Client Secret\n\n## Step 3: Configure in Admin Panel\n1. Paste Client ID and Client Secret in the form\n2. Click "Test Connection" to validate\n3. Save the configuration\n\n## Troubleshooting\n- **"No GA4 properties found"**: User needs at least one GA4 property with Admin or Editor access\n- **"Insufficient permissions"**: Enable Analytics Admin API in Google Cloud Console\n- **"Access denied"**: Check that scopes include analytics.edit'
WHERE integration_type = 'ga4';