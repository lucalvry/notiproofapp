# Guided setup, business details, settings layout, admin access, dashboard filters, win-back emails

Referral payouts are **paused** until Stripe Connect is set up on your side.

## What the data shows today

- 9 businesses: 7 have no proof at all, 5 finished onboarding, 4 have a verified install. None has an industry or a brand voice.
- **"Active" does not mean installed.** A widget becomes "Active" as soon as the owner switches it on. The separate "Installed" check only happens when the user clicks Verify: we open their page once and look for our script. Nothing re-checks it later.

## 1. Guided setup checklist

After sign-up and email confirmation, users go through one guided flow, and a progress checklist stays on the dashboard until every step is done:

```text
1 Add business + website ─> 2 Connect a proof source ─> 3 Import (progress screen)
   ─> 4 Approve imported proofs ─> 5 Build widget with live preview ─> 6 Install + auto-verify
```

- Step 2 suggests Google reviews first (paste your Google Business link), with Stripe, Shopify, WooCommerce or "Request testimonials" as other options.
- Step 3 shows a live "Importing your reviews…" screen with a count, then lists everything imported.
- Step 4: approve or reject inline, with "Approve all 4–5 star".
- Step 5: the widget builder opens with the approved proofs already in a live preview.
- Step 6: the install snippet plus a "Check my site" button. The step only completes once our script is detected.
- Before this ships, run a real end-to-end test of each source's connect flow (Google, Stripe, Shopify, WooCommerce, Zapier), so users don't hit errors. Anything broken gets fixed, or hidden from the guide.

## 2. Honest "Live" status

- New status: **Live on site** appears only after our script is actually detected. That means a successful site check, or the widget recording real visits from that domain.
- Re-check every day. If the script hasn't been seen for 2 days, the status changes to "Not detected" and the owner is emailed.
- Existing "active" widgets show "Switched on – not yet detected" until confirmed.

## 3. Help everywhere

- Every page in the side menu (Proof library, Widgets, Content, Campaigns, Case studies, Integrations, Analytics, Settings) gets a short "What is this?" tip next to its title, plus a one-time intro on first visit.
- **Required fields:** a red marker on the field, a short message explaining what's needed ("Your website address, e.g. acme.com — we read it to learn about your business"), and focus jumps to the first missing field. This applies on sign-up, onboarding, business creation, widget builder, campaigns and settings.

## 4. Business details ("business DNA")

- **Website becomes required** when creating any business.
- After the website is entered, AI reads the site and pre-fills: industry, target audience, customers, problems solved, how customers look for answers, and brand tone. The owner reviews and edits.
- The result fills **Brand voice** automatically, with a richer form: audience, value, tone, words to use or avoid, and examples.
- **Industry list grows on its own:** a new industry list starts with common ones. If the AI or the owner names one that isn't there (e.g. Agriculture), it's added for future businesses. The 9 existing businesses get filled in from their websites.
- **Favicon:** the website's favicon is fetched and shown next to the business name in the business switcher, instead of a letter.
- **Logo upload:** owners upload their logo file (stored on Bunny's default address). It's used in the email preview and in sent emails.

## 5. Settings pages full width

Business, Account, Brand voice, Content preferences and Publishing channels get the same full-width layout as Billing and Team. Wide pages use two columns where it helps.

## 6. Admin has no limits

Platform admins skip every plan limit: proofs, widgets, domains, seats, storage and video length, in both the app and the backend checks. A "Test as plan" switch on the admin business page lets you preview Free, Starter and Pro limits.

## 7. Dashboard and analytics date filters

- Dashboard: 7 / 30 / 90 days / 1 year filter applies to every number.
- Analytics: add 90 days and 1 year, plus a custom range.

## 8. Data history as a paid benefit

- Use the existing plan setting for how long data is kept. Free users see a clear notice ("Free plan keeps 30 days of history — upgrade to keep it longer") on Analytics and the Dashboard.
- Older data is cleaned up only for free plans. Paid plans keep their full history.
- The exact day counts get confirmed from the current plan settings before any copy is written.

## 9. Emails for every step and win-back (via Resend)

Branded emails using the business logo and NotiProof's logo:

- Welcome.
- Setup nudges: no proof after 2 days, no widget after 4, not installed after 7.
- "Your first proof is live".
- Script not detected.
- **Win-back** for inactive users at 14, 30 and 60 days ("It's been a while — here's what you're missing").
- Every email has an unsubscribe link. Sending is logged, and admins can see who got what.

## Order

1. Settings full width, admin unlimited, date filters (quick).
2. Required field markers, page tips.
3. Website required, business details, industries, favicon, logo upload.
4. Guided setup with import progress and approval.
5. Live-on-site verification.
6. Data history notices.
7. Emails and win-back.

## Technical details

- New `industries` table (name unique, slug, created_by_ai). Upsert on business save. `businesses` gains `favicon_url`, `business_profile` jsonb, and `widget_last_seen_at` per domain via `widget-track`.
- `analyze-business-site` edge function: fetch the homepage, extract the favicon, AI-summarise into the profile and brand voice.
- `is_platform_admin()` short-circuit inside `can_create_proof`, `can_activate_widget`, `can_add_domain`, `can_invite_seat`, `can_upload_media` and the enforcement triggers. Client limit helpers check `profile.is_admin`.
- `onboarding_progress` derived from live counts. Setup checklist component on the Dashboard.
- Daily cron: install re-check plus lifecycle email dispatcher (`email_sends` log table, `email_unsubscribes`).
- Shared `RequiredField` wrapper and `PageIntro` tooltip component, used across forms and pages.