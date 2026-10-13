# Audit report v2, sign-up attribution, and referral program

## 1. Updated audit report (v2)
- Read all six uploaded documents: the Pre-Build Spec v2, the Phase 2 Spec, the Phase 3 Spec, the Phase 1-2-3 Architecture notes, the Phase 8 Widget Orchestration notes, and the Testimonial System status.
- Turn every item in them into one checklist, and compare each item with the current app and database.
- Give every item one of these statuses:
  - Implemented properly
  - Implemented but not properly (with what's wrong)
  - Not implemented
  - Replaced by a newer design (for example, the older notification queue and form builder that the current widget system replaced)
- Add a new "Spec vs Build" section with tables for each document, and link each source document in the report.
- Update the earlier sections and the ranked fix list to match.
- **ChatGPT apps, Claude plugins and MCP:** research how these work today. That covers ChatGPT apps (the Apps SDK, which is built on MCP), Claude connectors, Gemini, and the directories where they're listed. The report will explain:
  - Yes, the "plugins for ChatGPT" idea is the same thing as MCP.
  - What a NotiProof app inside these assistants would let users do.
  - How directory listings bring in new users.
  - One limit: this project runs on your own Supabase account, and Lovable can't publish an AI-assistant connection there. It would need either a move to Lovable Cloud or a separate deployment.
- Save it as a new version, `NotiProof_Audit_Report_v2` (both .md and .pdf), so the original stays unchanged.

## 2. Required sign-up questions (why you joined, where you found us)
On the Register page, before the account is created, two required questions are added:
- **What brings you to NotiProof?** Choices: show reviews on my website, collect testimonials, more sales/conversions, social proof for ads and content, an agency managing clients, other (type it in).
- **Where did you hear about us?** Choices: ChatGPT, Gemini, Claude, Perplexity, Google, Bing/Yahoo, YouTube, TikTok, Instagram, Facebook, LinkedIn, X, a friend or colleague, a blog or article, a podcast, other.
  - Some choices ask one follow-up question:
    - YouTube: which channel?
    - TikTok or Instagram: which account?
    - Friend or colleague: their name or email
    - Blog or podcast: which one?
- Google sign-up gets the same two questions on the first onboarding screen, so no one skips them.
- The answers are saved to the user's profile. The admin console gets a new "Sign-up sources" view showing counts by source, by reason, and by named person or channel.

## 3. Referral program (20% recurring commission)
- **Rule:** the referrer earns **20% of every subscription payment** their referred customer makes, every month, for as long as that customer stays subscribed. Commission stops when the subscription is cancelled. Refunded payments reverse the commission.
- Every user gets a personal link, `app.notiproof.xyz/register?ref=CODE`, on a new **Referrals** page under Settings. The page shows:
  - the link, with a copy button
  - how many people clicked it, signed up, and are paying
  - commission earned, pending and paid
  - a place to enter payout details (bank or PayPal email)
- The referral code is remembered on the device for 60 days, so the referral still counts if the person signs up later. If someone signs up through a link, the "where did you hear about us" answer is filled in as "Referred by [name]".
- When a payment comes in through Stripe, a commission entry is created automatically. When a refund comes in, a reversal entry is created.
- An admin "Referrals" tab lists the people owed money and lets the admin mark commissions as paid. Payouts are made by hand at first; automatic payouts can come later.
- People can't refer themselves, and each new account can be credited to only one referrer.

## Technical details
- New tables (in the order the database requires: create the table, set access permissions, turn on row security, then add the access rules):
  - `signup_attribution`: user, reason, source, source detail, referral code
  - `referral_codes`: one per user
  - `referrals`: referrer, the person referred, status, dates
  - `referral_commissions`: payment ID, amount, 20% commission, currency, status (pending, paid, reversed)
  - `referral_payout_details`
- Users can only see their own records; admins can see everything.
- The Stripe payment handler gets two new cases:
  - a paid invoice creates a commission
  - a refund marks the matching commission as reversed
- The 20% rate is kept in one shared setting. Small tests check that it's exactly 20%, that a refund reverses the commission, and that there's no commission after cancellation.
- The `?ref=` code is saved in the browser, sent with sign-up, and recorded by a secure database function.
- The program rules (20% recurring, required sign-up questions) are saved to project memory.
- The PDF pages are checked visually before delivery.
