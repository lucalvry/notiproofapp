# OAuth Integration Setup Guide

## For Administrators

This guide explains how to configure OAuth integrations in NotiProof so that users can connect their accounts.

### Overview

NotiProof uses a two-part OAuth configuration system:

1. **System Configuration** (Pre-configured): OAuth endpoints, scopes, and technical parameters are already set up in the database
2. **Admin Configuration** (You provide): Client ID and Client Secret from your OAuth provider

This approach means you don't need to manually enter OAuth URLs or scopes - just the credentials.

---

## Integration-Specific Setup

### Google Analytics 4 (GA4)

**1. Create OAuth Credentials**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Click "APIs & Services" → "Library"
4. Search for and enable "Google Analytics Admin API"
5. Go to "APIs & Services" → "Credentials"
6. Click "Create Credentials" → "OAuth 2.0 Client ID"
7. Select "Web application" as the application type
8. Give it a name (e.g., "NotiProof GA4 Integration")

**2. Configure Redirect URI**

1. In NotiProof Admin Panel, go to Integrations → GA4 → Configure
2. Copy the displayed Redirect URI
3. Back in Google Cloud Console, under "Authorized redirect URIs", click "Add URI"
4. Paste the copied URI and save

**3. Add Credentials to NotiProof**

1. In Google Cloud Console, copy the "Client ID"
2. Click "Download JSON" or reveal "Client Secret" and copy it
3. In NotiProof Admin Panel:
   - Paste Client ID in the "Client ID" field
   - Paste Client Secret in the "Client Secret" field
4. Click "Test Connection" to validate
5. Click "Save"

**Pre-configured Settings:**
- Scopes: `analytics.readonly`, `analytics.manage.users.readonly`
- OAuth endpoints are automatically configured
- Users will be prompted to select their GA4 property after authentication

---

### Instagram

**1. Create Facebook App**

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Select "Consumer" as app type
4. Fill in app details and create

**2. Add Instagram Basic Display**

1. In your app dashboard, click "Add Product"
2. Find "Instagram Basic Display" and click "Set Up"
3. Scroll to "User Token Generator" section
4. Click "Add or Remove Instagram Testers"
5. Add the Instagram account you want to test with

**3. Configure OAuth**

1. In NotiProof Admin Panel, go to Integrations → Instagram → Configure
2. Copy the OAuth Redirect URI shown
3. Back in Facebook Developers, under "Instagram Basic Display" → "Settings":
   - Paste the URI into "OAuth Redirect URIs"
   - Fill in "Deauthorize Callback URL" and "Data Deletion Request URL" (can be same as redirect)
4. Save changes

**4. Add Credentials to NotiProof**

1. In Facebook Developers, go to Settings → Basic
2. Copy "App ID" (this is your Client ID)
3. Click "Show" next to "App Secret" and copy it (this is your Client Secret)
4. In NotiProof Admin Panel:
   - Paste App ID as "Client ID"
   - Paste App Secret as "Client Secret"
5. Click "Test Connection" to validate
6. Click "Save"

**Pre-configured Settings:**
- Scopes: `user_profile`, `user_media`
- Tokens are automatically exchanged for 60-day long-lived tokens
- Users need Instagram Business or Creator accounts

---

### Google My Business (Reviews)

**1. Create OAuth Credentials**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable "Google My Business API"
4. Go to "APIs & Services" → "Credentials"
5. Create "OAuth 2.0 Client ID" (Web application)

**2. Configure and Add to NotiProof**

1. In NotiProof, copy the Redirect URI from Admin Panel → Integrations → Google Reviews
2. Add the URI to Google Cloud Console under "Authorized redirect URIs"
3. Copy Client ID and Client Secret
4. Paste into NotiProof and save

**Pre-configured Settings:**
- Scope: `business.manage`
- OAuth endpoints automatically configured

---

### HubSpot

**1. Create HubSpot App**

1. Go to [HubSpot Developer Account](https://developers.hubspot.com/)
2. Create or select an app
3. Go to "Auth" tab
4. Copy the Redirect URI from NotiProof and add to HubSpot
5. Copy Client ID and Client Secret
6. Paste into NotiProof Admin Panel → Integrations → HubSpot

**Pre-configured Settings:**
- Scopes: `crm.objects.contacts.read`, `crm.objects.companies.read`

---

### Salesforce

**1. Create Connected App**

1. Log in to Salesforce
2. Go to Setup → Apps → App Manager
3. Click "New Connected App"
4. Fill in basic information
5. Enable "OAuth Settings"
6. Set callback URL from NotiProof
7. Add OAuth scopes: `api`, `refresh_token`
8. Save and copy Consumer Key (Client ID) and Consumer Secret (Client Secret)

**Pre-configured Settings:**
- Required scopes automatically set
- OAuth endpoints configured

---

### Mailchimp

**1. Create Mailchimp OAuth Application**

1. Go to [Mailchimp OAuth2 Portal](https://admin.mailchimp.com/account/oauth2/)
2. Log in with your Mailchimp account credentials
3. Click "Create A Client" or "Register App"
4. Fill in the application details:
   - **App Name**: NotiProof Integration (or your preferred name)
   - **Description**: Social proof notification integration for displaying real-time customer activity
   - **Company/Organization**: Your company name

**2. Configure Redirect URI**

1. In NotiProof Admin Panel, go to Integrations → Mailchimp → Configure
2. Copy the displayed Redirect URI (should be: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-mailchimp?action=callback`)
3. Back in Mailchimp OAuth portal, paste this exact URI in the "Redirect URI" field
4. **Important**: The URI must include the `?action=callback` query parameter

**3. Select Permissions (Scopes)**

Select the following scopes for your Mailchimp app:
- Read access to lists and subscribers
- Read access to campaigns
- (Optional) Read access to reports for campaign analytics

**4. Add Credentials to NotiProof**

1. After creating the app, Mailchimp will display your credentials
2. Copy the **Client ID** (long alphanumeric string)
3. Click "Show" or "Reveal" next to **Client Secret** and copy it
4. In NotiProof Admin Panel:
   - Navigate to Integrations → Mailchimp → Configure
   - Paste Client ID in the "Client ID" field
   - Paste Client Secret in the "Client Secret" field
5. Click "Test Connection" to validate
6. Click "Save"

**Pre-configured Settings:**
- OAuth endpoints are automatically configured
- Scopes: Read access to audience data and campaigns
- Integration type: REST API polling

**Important Notes:**
- Mailchimp OAuth apps must be in "Active" or "Published" status
- Development/Draft apps may have connection limitations
- Ensure your Mailchimp account has API access enabled
- Keep your Client Secret secure and never commit it to version control

---

## Testing Your Configuration

After saving credentials:

1. Click "Test Connection" button in NotiProof Admin Panel
2. Wait for validation to complete
3. **If successful:** Users can now connect this integration
4. **If failed:** Check the error message and verify:
   - Client ID and Secret are correct
   - Redirect URI matches exactly (including http/https)
   - App is not in development mode with access restrictions
   - Required API is enabled (for Google integrations)

---

## Troubleshooting

### "Configuration not found or incomplete"
- Ensure Client ID and Client Secret are filled in
- Click "Save" before testing

### "Authorization URL unreachable"
- Check your internet connection
- Verify the OAuth provider's service status

### "Invalid redirect_uri" (from OAuth provider)
- Copy the exact Redirect URI from NotiProof
- Ensure it matches character-for-character in provider settings
- Check for trailing slashes or http vs https mismatches

### Users see "Failed to initiate OAuth"
- Run "Test Connection" in Admin Panel first
- Ensure integration status is "Active"
- Verify credentials haven't expired or been revoked

---

## For Users

### Connecting an Integration

1. Go to **Integrations** page in NotiProof
2. Find the integration you want to connect (e.g., "Google Analytics 4")
3. Click **"Connect"**
4. A popup window will open to the provider's authorization page
5. Log in to your account (if not already logged in)
6. Review and accept the permissions requested
7. You'll be redirected back to NotiProof
8. The integration status will change to **"Connected"**
9. Data will start syncing automatically

### Troubleshooting for Users

**"This integration has not been set up by administrators yet"**
- Contact your NotiProof administrator
- The integration needs OAuth credentials configured

**"OAuth configuration incomplete"**
- Contact support - there's a configuration issue
- Administrator needs to re-save credentials

**"Please allow popups for this site"**
- Enable popups in your browser for NotiProof
- Try connecting again

**Popup closes immediately**
- Check browser console for errors
- Try a different browser
- Disable browser extensions temporarily

**"Failed to exchange authorization code"**
- Contact administrator - credentials may be incorrect
- OAuth app might be in development mode

---

## Security Best Practices

1. **Rotate Credentials Regularly:** Update Client Secrets every 90 days
2. **Limit Access:** Only provide OAuth scopes that are actually needed
3. **Monitor Logs:** Check Integration Logs in Admin Panel for unauthorized attempts
4. **Test After Changes:** Always test after updating credentials
5. **Document Changes:** Keep track of when credentials were last updated

---

## Need Help?

- Check Integration Logs in Admin Panel for detailed error messages
- Review the provider's OAuth documentation
- Contact NotiProof support with the integration type and error message
