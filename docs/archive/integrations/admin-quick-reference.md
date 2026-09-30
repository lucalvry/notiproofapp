# Admin Quick Reference - OAuth Integrations

## Critical Credentials Checklist

### ✅ Shopify
- [ ] Partner account created at partners.shopify.com
- [ ] Public app created
- [ ] Client ID stored in admin config
- [ ] Client Secret stored in admin config
- [ ] App submitted for review
- [ ] App approved by Shopify

**Redirect URL:** `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-shopify/callback`

---

### ✅ HubSpot
- [ ] Developer account at developers.hubspot.com
- [ ] App created with correct scopes
- [ ] Client ID stored
- [ ] Client Secret stored
- [ ] App submitted for marketplace (optional)

**Redirect URL:** `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-hubspot/callback`

---

### ✅ Google (Reviews + GA4)
- [ ] Google Cloud project created
- [ ] APIs enabled (GMB API, GA Data API)
- [ ] OAuth client created (Web application)
- [ ] Client ID stored
- [ ] Client Secret stored
- [ ] OAuth consent screen configured
- [ ] Submitted for verification (production)

**Redirect URLs:**
- GA4: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/ga4-auth/callback`
- Reviews: `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-google-reviews/callback`

---

### ✅ Instagram
- [ ] Facebook developer account
- [ ] Facebook app created (Business type)
- [ ] Instagram Basic Display added
- [ ] App ID stored
- [ ] App Secret stored
- [ ] App submitted for review
- [ ] `instagram_basic` permission approved

**Redirect URL:** `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-instagram/callback`

---

### ✅ Twitter/X
- [ ] Developer account approved
- [ ] App created in developer portal
- [ ] OAuth 2.0 enabled
- [ ] API Key (Client ID) stored
- [ ] API Secret (Client Secret) stored
- [ ] Elevated access applied (optional)

**Redirect URL:** `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-twitter/callback`

---

### ✅ Mailchimp
- [ ] Developer account at mailchimp.com/developer
- [ ] OAuth app registered
- [ ] Client ID stored
- [ ] Client Secret stored
- [ ] App submitted for marketplace (optional)

**Redirect URL:** `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-mailchimp/callback`

---

### ✅ Intercom
- [ ] Developer Hub account
- [ ] OAuth app created
- [ ] Client ID stored
- [ ] Client Secret stored
- [ ] Permissions configured (read_users, read_conversations)
- [ ] App submitted for review

**Redirect URL:** `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-intercom/callback`

---

### ✅ Salesforce NPSP
- [ ] Developer org created
- [ ] Connected app created
- [ ] Consumer Key (Client ID) stored
- [ ] Consumer Secret stored
- [ ] Security review submitted (AppExchange)

**Redirect URL:** `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-salesforce/callback`

---

### ✅ Spotify
- [ ] Developer account at developer.spotify.com
- [ ] App created
- [ ] Client ID stored
- [ ] Client Secret stored
- [ ] Scopes configured
- [ ] Quota extension requested (if needed)

**Redirect URL:** `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-spotify/callback`

---

### ✅ SoundCloud
- [ ] Developer app registered
- [ ] Client ID stored
- [ ] Client Secret stored

**Redirect URL:** `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-soundcloud/callback`

---

## Webhook Integrations (No Admin Setup)

These are configured by users themselves:

- Generic Webhook
- Stripe
- WooCommerce  
- PayPal
- Razorpay
- Flutterwave
- Plaid
- Typeform
- Calendly
- JotForm
- WordPress
- Webflow
- Ghost
- Framer
- Segment
- Gumroad
- Teachable
- Thinkific
- LearnDash
- Squarespace
- Beehiiv
- ConvertKit
- Mixpanel
- Circle

---

## Emergency Contacts

**Platform Support:**
- Shopify Partner Support: partners.shopify.com/support
- Google Cloud Support: cloud.google.com/support
- Facebook Developer Support: developers.facebook.com/support
- Twitter Developer Support: developer.twitter.com/support

**Internal:**
- Lead Developer: dev@notiproof.com
- DevOps Team: ops@notiproof.com

---

## Production Verification Status

| Integration | Credentials Set | App Submitted | App Approved | Production Ready |
|------------|----------------|---------------|--------------|-----------------|
| Shopify | ❓ | ❓ | ❓ | ❓ |
| HubSpot | ❓ | ❓ | ❓ | ❓ |
| Google (Reviews/GA4) | ❓ | ❓ | ❓ | ❓ |
| Instagram | ❓ | ❓ | ❓ | ❓ |
| Twitter/X | ❓ | ❓ | ❓ | ❓ |
| Mailchimp | ❓ | ❓ | ❓ | ❓ |
| Intercom | ❓ | ❓ | ❓ | ❓ |
| Salesforce | ❓ | ❓ | ❓ | ❓ |
| Spotify | ❓ | ❓ | ❓ | ❓ |
| SoundCloud | ❓ | ❓ | ❓ | ❓ |

**Last Updated:** November 2025

---

## Quick Test Commands

Test if integration is configured:
```bash
# Check if credentials exist
curl https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/test-integration \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"integration_type": "shopify"}'
```

Test OAuth flow:
```bash
# Initiate OAuth flow
curl https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/oauth-shopify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Print this page and keep near your desk for quick reference!**
