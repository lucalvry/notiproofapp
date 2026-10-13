# Email switch, honest integration status, fuller admin view, storage fix, referral payouts

You were right: the audit missed the email domain problem and overstated LinkedIn/X. The findings below come from the code and live data.

## 1. Straight answer on LinkedIn, X and email "connect pieces"
- **LinkedIn and X do not work today.** The posting code exists, but there is no LinkedIn or X app, no sign-in ("OAuth") flow, and no keys. The Channels page marks them "OAuth", but nothing lets a user connect. "Working if key is set" was misleading. Nobody has a key, and nobody can get one through the app.
- **Buffer** has a real sign-in flow. One channel exists, but it is stuck on "pending" and has never posted.
- **Mailchimp, Klaviyo, ConvertKit**: users paste a key, but it is saved unchecked and in plain form inside the settings, not encrypted, despite what the screen says.
- The report gets corrected (v3). Each channel will be labelled **Live**, **Built – not connectable** or **Not built**.
- Getting LinkedIn and X live needs your own developer apps with them (LinkedIn "Share on LinkedIn" approval; X paid API tier). That's a separate step once you have those accounts. Until then, both get hidden or marked "Coming soon" so users don't hit a dead end.

## 2. Move all email from Brevo to Resend
Seven email senders still use Brevo: testimonial requests, reminders, test email, scheduled emails, client invitations, agency team invitations and scheduled reports. Their default sender is already set to `noreply@notiproof.xyz`, but Brevo is only verified for `.com`, so sending fails.
- Build one shared email sender on Resend and point all seven at it. Remove every Brevo setting.
- Sender: `NotiProof <noreply@notiproof.xyz>`, or the business's name with that address.
- Use the Resend key already saved in your Supabase (`RESEND_API_KEY`). No new key needed. Before switching, a quick check confirms the key is readable and `notiproof.xyz` is verified in Resend. If either check fails, I'll tell you exactly what's wrong instead of asking for a new key.
- Delete Brevo completely: its code, settings and messages, from all seven senders.
- If an email fails to send, the screen shows Resend's real reason to the user.
- Then send a test of each email type.
- Also tidy the last leftover `.com` addresses, kept only so old links still work.

## 3. Admin: complete picture of every business and person
**Business detail page**: add an Owner card (name, email, sign-up date, sign-up answers, referral source, last sign-in) and a Domains card (every connected domain, primary, verified or not). Add the team list with roles, widgets with status, and the install check. The display name shows a "named from email" note when it was inferred.

**New "Users" page in the admin menu**: everyone with email, name, sign-up date, sign-up answers, how many businesses they own or belong to (with links), agency, plan and paying status. Searchable. Clicking a person shows all their businesses.

**Agencies**: list each agency with owner, plan, seat use, client businesses and team, plus a detail view.

**Integrations overview**: totals by type, a health status per connection, and a fixed **build status** for every integration type: Live end-to-end / Partially built / Not built. This is based on the code audit, not "has some code". Example: Stripe, WooCommerce, Shopify, Zapier, Google Reviews = built. LinkedIn/X = not connectable. Plaid, WordPress, Trustpilot, G2 get checked and labelled in the same way.

**Audit log**: it shows almost nothing because only 12 events were ever recorded, all impersonation or re-sync. Start recording every admin action: plan changes, trial extensions, suspend or unsuspend, deletes, moderation decisions, commission marked paid, alert resolved. Also add a platform-wide log page with filters.

## 4. Storage showing zero
Confirmed cause: 11 proofs, 3 with media, **0 with a recorded size**. Uploads go to Bunny, and only the public testimonial form records file size. Dashboard uploads never do. The storage card also only counts files in the backend's own storage, not Bunny.
- Record size and length for every upload path.
- Back-fill the existing media sizes.
- The admin storage card will show Bunny media totals per business and overall.

## 5. Referral payouts (Shopify-style, 20%)
Proposed rules (adjustable):
- **Payout day:** the 21st of each month, for commissions over 30 days old. The 30-day wait covers refunds.
- **Minimum:** $25. Below that, the balance rolls over to the next month.
- **How people get paid:** through **Stripe Connect** (Express accounts). Each referrer adds their bank details on Stripe's own secure screen, so only Stripe-supported banks and countries are accepted and details get checked by Stripe. This replaces the free-text PayPal/bank box.
- **Fees:** any transfer or currency fees come out of the referrer's payout. The referral page and terms say this clearly.
- **Admin control:** on payout day, admin sees a "Ready to pay" list (eligible, verified, over threshold, nothing on hold), reviews it, and approves. Payment is then sent through Stripe. Nothing goes out automatically without approval.
- The referral page shows: pending (in the 30-day hold), available, paid, next payout date, and the threshold.
- **Needs from you:** Stripe Connect switched on in your Stripe account, and your country must support Express payouts.

## 6. Re-audit and report v3
Re-check every area for the same kind of miss (old domain, Brevo, stub screens, unencrypted keys) and publish v3 with corrected statuses plus a "what changed since v2" section.

## Order of work
1. Email to Resend (blocked until the Resend key is in).
2. Storage fix and back-fill.
3. Admin Owner/Domain/Users/Agencies/Integrations pages and audit log.
4. Honest channel labels.
5. Payouts (blocked until Stripe Connect is on).
6. Report v3.

## Technical details
- `_shared/email.ts` (Resend REST, `RESEND_API_KEY` Supabase secret, `EMAIL_FROM`). Replace Brevo calls in the 7 functions; delete Brevo env usage.
- Admin reads use `is_platform_admin()` security-definer RPCs: `admin_users_overview`, `admin_business_owner`, `admin_integration_catalog`. Owner email comes from `public.users`; last sign-in from `auth.users` via the RPC.
- `log_admin_action` called from each admin mutation, plus moderation and `Growth` mark-paid; new `/admin/audit` page.
- Call `update_proof_media_metadata` after the Bunny upload in `bunny-upload.ts` callers. The back-fill uses an edge function doing HEAD requests on Bunny URLs. `get-storage-metrics` sums `media_size_bytes` grouped by business.
- Payouts: `referral_payout_accounts` (stripe_account_id, payouts_enabled), commission `available_at = created_at + 30d`, `payout_batches` table. Edge functions `connect-onboard`, `connect-webhook`, and `run-payout-batch` (admin-approved `stripe.transfers.create`). Threshold and day stored in one config. Rules tested in `src/lib/referrals.ts` and mirrored in `_shared/referral-commission.ts`.
- Publishing: move pasted keys into `credentials_encrypted` via `publishing-channel-credentials`; LinkedIn/X tiles gated as "Coming soon".
