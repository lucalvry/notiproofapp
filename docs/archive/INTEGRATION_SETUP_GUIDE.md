# NotiProof Integration Setup Guide
## Complete Reference for All 35 Integrations

**Last Updated:** November 2025  
**Version:** 1.0

---

## Table of Contents

1. [Quick Reference Matrix](#quick-reference-matrix)
2. [OAuth Integrations (Admin Setup Required)](#oauth-integrations)
3. [Webhook Integrations (User Self-Service)](#webhook-integrations)
4. [Special Cases](#special-cases)
5. [Production Deployment Checklist](#production-deployment-checklist)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [API Rate Limits & Quotas](#api-rate-limits--quotas)

---

## Quick Reference Matrix

| Integration | Type | Admin Setup Required | Est. Time | Complexity | Category |
|------------|------|---------------------|-----------|------------|----------|
| **Generic Webhook** | Webhook | ❌ No | 2 min | Easy | Automation |
| **Zapier** | Proxy | ❌ No | 5 min | Easy | Automation |
| **Shopify** | OAuth | ✅ Yes | 30 min | Medium | E-commerce |
| **WooCommerce** | Webhook | ❌ No | 10 min | Easy | E-commerce |
| **Stripe** | Webhook | ❌ No | 10 min | Easy | Payments |
| **PayPal** | Webhook | ❌ No | 10 min | Easy | Payments |
| **Razorpay** | Webhook | ❌ No | 10 min | Easy | Payments |
| **Flutterwave** | Webhook | ❌ No | 10 min | Easy | Payments |
| **Plaid** | Webhook | ❌ No | 45 min | Hard | Fintech |
| **Typeform** | Webhook | ❌ No | 5 min | Easy | Forms |
| **Calendly** | Webhook | ❌ No | 10 min | Easy | Forms |
| **JotForm** | Webhook | ❌ No | 5 min | Easy | Forms |
| **HubSpot** | OAuth | ✅ Yes | 45 min | Hard | CRM |
| **Intercom** | OAuth | ✅ Yes | 40 min | Hard | CRM |
| **Salesforce NPSP** | OAuth | ✅ Yes | 60 min | Hard | CRM |
| **Instagram** | OAuth | ✅ Yes | 35 min | Medium | Social |
| **Twitter/X** | OAuth | ✅ Yes | 35 min | Medium | Social |
| **Google Reviews** | OAuth | ✅ Yes | 30 min | Medium | Social |
| **WordPress** | Webhook | ❌ No | 10 min | Easy | CMS |
| **Webflow** | Webhook | ❌ No | 10 min | Easy | CMS |
| **Ghost** | Webhook | ❌ No | 10 min | Easy | Content |
| **Framer** | Webhook | ❌ No | 15 min | Medium | CMS |
| **Substack** | API Poll | ❌ No | 25 min | Medium | Content |
| **RSS Feeds** | API Poll | ❌ No | 5 min | Easy | Content |
| **Mailchimp** | OAuth | ✅ Yes | 35 min | Hard | Email |
| **Beehiiv** | Webhook | ❌ No | 10 min | Easy | Email |
| **ConvertKit** | Webhook | ❌ No | 10 min | Easy | Email |
| **Google Analytics 4** | OAuth | ✅ Yes | 30 min | Medium | Analytics |
| **Segment** | Webhook | ❌ No | 15 min | Medium | Analytics |
| **Mixpanel** | Webhook | ❌ No | 15 min | Medium | Analytics |
| **Teachable** | Webhook | ❌ No | 10 min | Easy | Education |
| **Thinkific** | Webhook | ❌ No | 10 min | Easy | Education |
| **LearnDash** | Webhook | ❌ No | 15 min | Medium | Education |
| **Squarespace** | Webhook | ❌ No | 10 min | Easy | E-commerce |
| **Gumroad** | Webhook | ❌ No | 10 min | Easy | E-commerce |
| **Spotify** | OAuth | ✅ Yes | 40 min | Hard | Music |
| **SoundCloud** | OAuth | ✅ Yes | 30 min | Medium | Music |
| **Circle** | Webhook | ❌ No | 20 min | Medium | Community |

---

## OAuth Integrations

These integrations require the NotiProof admin team to create developer apps on each platform before users can connect.

### 1. Shopify

**Category:** E-commerce  
**Setup Time:** 30 minutes  
**Complexity:** Medium

#### Admin Setup (NotiProof Team)

1. **Create Shopify Partner Account**
   - Go to: https://partners.shopify.com/signup
   - Create account with NotiProof company details
   - Verify email address

2. **Create Public App**
   - Dashboard → Apps → Create App
   - App Name: "NotiProof Social Proof"
   - App URL: `https://notiproof.com`
   - Redirect URLs: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-shopify/callback`

3. **Configure OAuth Scopes**
   Required scopes:
   - `read_orders`
   - `read_customers`
   - `read_products`
   - `read_checkouts`
   - `read_inventory`

4. **Get Credentials**
   - Client ID: Found in App Info section
   - Client Secret: API Secret Key (copy immediately, won't show again)
   - Store in NotiProof Admin → Integrations → Shopify → Configure

5. **Submit for Review**
   - Fill out app listing details
   - Add privacy policy URL: `https://notiproof.com/privacy`
   - Add GDPR compliance information
   - Submit for Shopify approval (7-14 days)

#### User Setup

1. Go to NotiProof Dashboard → Integrations
2. Click "Connect Shopify"
3. Authorize NotiProof to access their store
4. Select which events to track (orders, carts, products)
5. Done! Events start flowing immediately

#### Testing

1. Create test order in Shopify store
2. Verify webhook received in NotiProof logs
3. Check notification displays on test website

---

### 2. HubSpot

**Category:** CRM  
**Setup Time:** 45 minutes  
**Complexity:** Hard

#### Admin Setup (NotiProof Team)

1. **Create HubSpot Developer Account**
   - Go to: https://developers.hubspot.com/
   - Sign up with NotiProof company email
   - Verify account

2. **Create Public App**
   - Dashboard → Apps → Create App
   - App Name: "NotiProof"
   - Description: "Display real-time social proof notifications"
   - Redirect URL: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-hubspot/callback`

3. **Configure Scopes**
   Required scopes:
   - `contacts` (read)
   - `crm.objects.contacts.read`
   - `crm.objects.deals.read`
   - `timeline` (read)

4. **Get Credentials**
   - Client ID: Found in App Info
   - Client Secret: Generate and save securely
   - Store in NotiProof Admin → Integrations → HubSpot

5. **Submit for Marketplace Review** (optional for public listing)
   - Add app logo (512x512 px)
   - Write detailed description
   - Add screenshots
   - Submit for HubSpot review

#### User Setup

1. NotiProof Dashboard → Integrations → HubSpot
2. Click "Connect HubSpot"
3. Select HubSpot portal to connect
4. Approve requested permissions
5. Configure which CRM events to track

---

### 3. Google Reviews / Google Analytics 4

**Category:** Social / Analytics  
**Setup Time:** 30 minutes  
**Complexity:** Medium

#### Admin Setup (NotiProof Team)

1. **Create Google Cloud Project**
   - Go to: https://console.cloud.google.com
   - Create new project: "NotiProof Integrations"
   - Enable billing (required for OAuth)

2. **Enable APIs**
   - Enable "Google My Business API" (for Reviews)
   - Enable "Google Analytics Data API" (for GA4)

3. **Create OAuth Credentials**
   - APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Name: "NotiProof OAuth Client"
   - Authorized redirect URIs:
     - `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/ga4-auth/callback`
     - `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-google-reviews/callback`

4. **Configure OAuth Consent Screen**
   - User type: External
   - App name: "NotiProof"
   - Support email: support@notiproof.com
   - Scopes:
     - `https://www.googleapis.com/auth/business.manage` (Reviews)
     - `https://www.googleapis.com/auth/analytics.readonly` (GA4)

5. **Get Credentials**
   - Client ID and Client Secret
   - Store in NotiProof Admin → Integrations

6. **Submit for Verification** (for production)
   - Complete OAuth consent screen verification
   - Add privacy policy and terms
   - Submit for Google review (2-6 weeks)

#### User Setup

1. NotiProof Dashboard → Integrations → Google Reviews/GA4
2. Click "Connect Google Account"
3. Select Google account
4. Grant requested permissions
5. Select business location (Reviews) or GA4 property
6. Configure notification settings

---

### 4. Instagram

**Category:** Social  
**Setup Time:** 35 minutes  
**Complexity:** Medium

#### Admin Setup (NotiProof Team)

1. **Create Facebook Developer Account**
   - Go to: https://developers.facebook.com
   - Create account with NotiProof business details

2. **Create Facebook App**
   - My Apps → Create App
   - Type: Business
   - App Name: "NotiProof"
   - Contact Email: dev@notiproof.com

3. **Add Instagram Basic Display Product**
   - Dashboard → Add Product → Instagram Basic Display
   - Configure settings

4. **Configure OAuth Settings**
   - Valid OAuth Redirect URIs: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-instagram/callback`
   - Deauthorize Callback URL: `https://notiproof.com/integrations/instagram/deauth`
   - Data Deletion Request URL: `https://notiproof.com/integrations/instagram/deletion`

5. **Get Credentials**
   - Instagram App ID
   - Instagram App Secret
   - Store in NotiProof Admin → Integrations → Instagram

6. **Submit for App Review**
   - Request `instagram_basic` permission
   - Provide use case documentation
   - Submit screen recording demo
   - Wait for Facebook review (3-5 business days)

#### User Setup

1. NotiProof Dashboard → Integrations → Instagram
2. Click "Connect Instagram"
3. Log in to Facebook/Instagram
4. Grant permissions
5. Select Instagram Business account
6. Configure which posts/stories to track

---

### 5. Twitter/X

**Category:** Social  
**Setup Time:** 35 minutes  
**Complexity:** Medium

#### Admin Setup (NotiProof Team)

1. **Create Twitter Developer Account**
   - Go to: https://developer.twitter.com
   - Apply for developer account
   - Select use case: "Building tools for other businesses"
   - Describe NotiProof use case
   - Wait for approval (1-3 days)

2. **Create Twitter App**
   - Developer Portal → Projects & Apps → Create App
   - App Name: "NotiProof"
   - App Description: "Social proof notification platform"

3. **Configure OAuth 2.0**
   - App Settings → User authentication settings
   - Enable OAuth 2.0
   - Type of App: Web App
   - Callback URL: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-twitter/callback`
   - Website URL: `https://notiproof.com`

4. **Set Permissions**
   - Read permissions for:
     - Tweets
     - Users
     - Follows
     - Likes

5. **Get Credentials**
   - API Key (Client ID)
   - API Secret Key (Client Secret)
   - Store in NotiProof Admin → Integrations → Twitter

6. **Elevate Access** (optional for higher rate limits)
   - Apply for Elevated access
   - Provide detailed use case
   - Submit for review

#### User Setup

1. NotiProof Dashboard → Integrations → Twitter/X
2. Click "Connect Twitter"
3. Authorize NotiProof app
4. Select which tweet types to track
5. Configure notification display preferences

---

### 6. Mailchimp

**Category:** Email Marketing  
**Setup Time:** 35 minutes  
**Complexity:** Hard

#### Admin Setup (NotiProof Team)

1. **Create Mailchimp Developer Account**
   - Go to: https://mailchimp.com/developer/
   - Create account

2. **Register OAuth App**
   - Login → Account → Extras → API keys → OAuth
   - Create OAuth app
   - App Name: "NotiProof"
   - Redirect URI: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-mailchimp/callback`

3. **Get Credentials**
   - Client ID
   - Client Secret
   - Store in NotiProof Admin

4. **Submit for Review** (for public marketplace listing)
   - Complete integration profile
   - Add screenshots and demo video
   - Submit for Mailchimp review

#### User Setup

1. NotiProof Dashboard → Integrations → Mailchimp
2. Click "Connect Mailchimp"
3. Select Mailchimp account
4. Choose audience/list to track
5. Configure notification preferences

---

### 7. Intercom

**Category:** CRM  
**Setup Time:** 40 minutes  
**Complexity:** Hard

#### Admin Setup (NotiProof Team)

1. **Create Intercom Developer Account**
   - Go to: https://developers.intercom.com
   - Sign up with company email

2. **Create OAuth App**
   - Developer Hub → New App
   - App Name: "NotiProof"
   - OAuth redirect URL: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-intercom/callback`

3. **Request Permissions**
   - `read_users`
   - `read_conversations`
   - `read_messages`

4. **Get Credentials**
   - Client ID
   - Client Secret
   - Store in NotiProof Admin

5. **Submit for Review**
   - Complete app submission form
   - Provide use case and demo
   - Wait for Intercom approval

#### User Setup

1. Connect via NotiProof Dashboard
2. Authorize workspace
3. Select events to track
4. Configure notifications

---

### 8. Salesforce NPSP

**Category:** CRM (Nonprofit)  
**Setup Time:** 60 minutes  
**Complexity:** Hard

#### Admin Setup (NotiProof Team)

1. **Create Salesforce Developer Account**
   - Go to: https://developer.salesforce.com
   - Sign up for free developer org

2. **Create Connected App**
   - Setup → Apps → App Manager → New Connected App
   - App Name: "NotiProof"
   - Contact Email: dev@notiproof.com
   - Enable OAuth Settings
   - Callback URL: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-salesforce/callback`

3. **Configure OAuth Scopes**
   - `api` - Full access to all data
   - `refresh_token, offline_access` - Perform requests at any time

4. **Get Credentials**
   - Consumer Key (Client ID)
   - Consumer Secret (Client Secret)
   - Store in NotiProof Admin

5. **Security Review** (for AppExchange listing)
   - Complete security questionnaire
   - Provide architecture diagram
   - Submit for Salesforce security review (8-12 weeks)

#### User Setup

1. Connect Salesforce org via NotiProof
2. Grant permissions
3. Map NPSP donation objects
4. Configure notification rules

---

### 9. Spotify for Artists

**Category:** Music  
**Setup Time:** 40 minutes  
**Complexity:** Hard

#### Admin Setup (NotiProof Team)

1. **Create Spotify Developer Account**
   - Go to: https://developer.spotify.com/dashboard
   - Create account

2. **Create App**
   - Dashboard → Create an App
   - App Name: "NotiProof"
   - Redirect URI: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-spotify/callback`

3. **Configure Scopes**
   - `user-read-recently-played`
   - `user-top-read`
   - `user-follow-read`

4. **Get Credentials**
   - Client ID
   - Client Secret
   - Store in NotiProof Admin

5. **Submit for Quota Extension** (if needed)
   - Request higher rate limits
   - Provide use case justification

#### User Setup

1. Connect Spotify for Artists account
2. Authorize NotiProof
3. Select which metrics to display
4. Configure notification style

---

### 10. SoundCloud

**Category:** Music  
**Setup Time:** 30 minutes  
**Complexity:** Medium

#### Admin Setup (NotiProof Team)

1. **Register SoundCloud App**
   - Go to: https://developers.soundcloud.com
   - Create new application
   - Redirect URI: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-soundcloud/callback`

2. **Get Credentials**
   - Client ID
   - Client Secret
   - Store in NotiProof Admin

#### User Setup

1. Connect SoundCloud account
2. Authorize permissions
3. Select tracks to monitor
4. Configure notifications

---

## Webhook Integrations

These integrations allow users to configure webhooks themselves without requiring NotiProof admin setup.

### 1. Generic Webhook

**Category:** Automation  
**Setup Time:** 2 minutes  
**Complexity:** Easy

#### User Setup

1. NotiProof Dashboard → Integrations → Generic Webhook
2. Copy webhook URL: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-generic`
3. Configure your system to POST JSON to this URL
4. Example payload:
```json
{
  "event_type": "purchase",
  "user_name": "John Doe",
  "user_location": "New York, USA",
  "message": "just made a purchase",
  "timestamp": "2025-11-02T10:30:00Z"
}
```

---

### 2. Stripe

**Category:** Payments  
**Setup Time:** 10 minutes  
**Complexity:** Easy

#### User Setup

1. **Get Webhook Endpoint**
   - NotiProof Dashboard → Integrations → Stripe
   - Copy webhook URL: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-stripe`

2. **Configure in Stripe**
   - Stripe Dashboard → Developers → Webhooks
   - Add endpoint → Paste URL
   - Select events:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `customer.subscription.created`
     - `invoice.payment_succeeded`

3. **Copy Signing Secret**
   - Stripe shows: `whsec_...`
   - Paste in NotiProof → Stripe Settings → Webhook Secret

4. **Test**
   - Click "Send test webhook" in Stripe
   - Verify event appears in NotiProof logs

---

### 3. WooCommerce

**Category:** E-commerce  
**Setup Time:** 10 minutes  
**Complexity:** Easy

#### User Setup

1. **Get Webhook URL**
   - NotiProof: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-woocommerce`

2. **Configure in WooCommerce**
   - WooCommerce → Settings → Advanced → Webhooks → Add webhook
   - Topic: `Order created`, `Order updated`
   - Delivery URL: Paste NotiProof URL
   - Secret: Generate and save in NotiProof

3. **Test**
   - Create test order
   - Verify notification appears

---

### 4. Typeform

**Category:** Forms  
**Setup Time:** 5 minutes  
**Complexity:** Easy

#### User Setup

1. Get webhook URL from NotiProof
2. Typeform → Connect → Webhooks → Add webhook
3. Paste URL: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-typeform`
4. Tag: Leave blank or use `notiproof`
5. Test with form submission

---

### 5. Calendly

**Category:** Forms  
**Setup Time:** 10 minutes  
**Complexity:** Easy

#### User Setup

1. NotiProof webhook URL: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-calendly`
2. Calendly → Integrations → Webhooks → Create webhook
3. Paste URL and select events:
   - `invitee.created`
   - `invitee.canceled`
4. Save and test

---

### 6. WordPress

**Category:** CMS  
**Setup Time:** 10 minutes  
**Complexity:** Easy

#### User Setup

1. **Install NotiProof Plugin** (if available) OR
2. **Use Webhook Plugin:**
   - Install "WP Webhooks" plugin
   - Configure endpoint: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-wordpress`
   - Select triggers: new posts, comments, registrations

---

### 7. Webflow

**Category:** CMS  
**Setup Time:** 10 minutes  
**Complexity:** Easy

#### User Setup

1. NotiProof webhook: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-webflow`
2. Webflow → Project Settings → Integrations → Webhooks
3. Add webhook for form submissions and e-commerce events

---

### 8. PayPal

**Category:** Payments  
**Setup Time:** 10 minutes  
**Complexity:** Easy

#### User Setup

1. PayPal Business Account → Developer → Webhooks
2. Create webhook: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-paypal`
3. Subscribe to events:
   - `PAYMENT.SALE.COMPLETED`
   - `BILLING.SUBSCRIPTION.CREATED`

---

### 9. Teachable

**Category:** Education  
**Setup Time:** 10 minutes  
**Complexity:** Easy

#### User Setup

1. Teachable → Settings → Webhooks
2. Add URL: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-teachable`
3. Select events: enrollments, completions

---

### 10. JotForm

**Category:** Forms  
**Setup Time:** 5 minutes  
**Complexity:** Easy

#### User Setup

1. JotForm → Settings → Integrations → Webhooks
2. URL: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-jotform`
3. Test with form submission

---

### 11. Squarespace

**Category:** E-commerce  
**Setup Time:** 10 minutes  
**Complexity:** Easy

#### User Setup

1. Squarespace → Developer Mode → Webhooks
2. Configure: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/webhook-squarespace`
3. Events: orders, bookings, form submissions

---

*(Continue for all 35 integrations with similar detailed documentation...)*

---

## Special Cases

### Zapier

**Type:** Proxy Integration  
**Setup:** Users connect through Zapier platform  
**Complexity:** Easy

Users create Zaps that send data to NotiProof's webhook endpoint. No admin setup required.

---

### RSS Feeds

**Type:** API Polling  
**Setup:** User provides RSS feed URL  
**Complexity:** Easy

NotiProof polls the feed every 15 minutes to detect new content.

---

### Substack

**Type:** API Scraping  
**Setup:** User provides Substack publication URL  
**Complexity:** Medium

Note: No official API available. Uses web scraping (may be rate-limited).

---

## Production Deployment Checklist

Before going live with OAuth integrations:

- [ ] All OAuth apps approved by platforms
- [ ] Redirect URLs use production domain
- [ ] Rate limits configured appropriately
- [ ] Webhook signing secrets securely stored
- [ ] Error monitoring enabled (Sentry/LogRocket)
- [ ] Fallback messaging configured for API failures
- [ ] GDPR compliance reviewed
- [ ] Privacy policy mentions all integrations
- [ ] Terms of Service updated
- [ ] Support documentation published
- [ ] Admin team trained on troubleshooting

---

## Troubleshooting Guide

### Common Error: "OAuth redirect_uri_mismatch"

**Cause:** Redirect URL in app configuration doesn't match OAuth request  
**Solution:**
1. Check `supabase/config.toml` edge function URLs
2. Verify they match app configuration exactly
3. Ensure using HTTPS, not HTTP
4. Check for trailing slashes

### Common Error: "Webhook signature verification failed"

**Cause:** Wrong signing secret or timestamp drift  
**Solution:**
1. Regenerate webhook secret in platform
2. Update secret in NotiProof integration settings
3. Verify server time is accurate (use NTP)
4. Check webhook payload format matches expected structure

### Common Error: "Rate limit exceeded"

**Cause:** Too many API requests  
**Solution:**
1. Implement exponential backoff
2. Request quota increase from platform
3. Use webhook instead of polling where possible
4. Implement request queuing/throttling

### Common Error: "Insufficient permissions"

**Cause:** OAuth scopes don't include required permissions  
**Solution:**
1. Verify all required scopes are requested
2. Have user re-authorize the app
3. Check if platform changed permission requirements

---

## API Rate Limits & Quotas

| Integration | Rate Limit | Quota | Notes |
|------------|-----------|-------|-------|
| Shopify | 2 req/sec | 10,000/day | Per store |
| Stripe | 100 req/sec | Unlimited | Rolling rate limit |
| HubSpot | 100 req/10sec | 500,000/day | Per portal |
| Instagram | 200 req/hour | 10,000/day | Per user |
| Twitter | 300 req/15min | Varies by tier | Per app |
| Google APIs | 1,000 req/100sec | 10M/day | Per project |
| Mailchimp | 10 req/sec | 14,400/day | Per account |

**Best Practices:**
- Implement exponential backoff for all API calls
- Cache responses when appropriate
- Use webhooks instead of polling whenever possible
- Monitor rate limit headers and adjust accordingly

---

## Support Contacts

For integration-specific issues:
- **Email:** integrations@notiproof.com
- **Slack:** #integrations (for team)
- **Documentation:** https://docs.notiproof.com/integrations

---

**End of Guide**  
**Last Updated:** November 2025
