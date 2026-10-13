# Full NotiProof audit report

## What you get
One downloadable report covering everything built so far, its status, what is still missing, and a ranked list of next steps to get more sign-ups.

## Already confirmed
- The codes like INT-01, SET-04, WID-01 and ONB-01 to ONB-04 are leftover internal labels from the original build spec. They are printed in small grey text at the top of pages. They do nothing for users and should be removed. The report will list every page that has one.
- PostHog (the tool that tracks what visitors do) is in the code and sends data to its EU servers. The audit will check whether it actually receives data and which actions it records.

## What the report covers
1. **Sign-up to first result**: sign-up, email confirmation, onboarding steps, install check, first widget, first live notification. Each step is marked Working, Partly working, Broken or Not built.
2. **Proof collection and storage**: proof library, testimonial requests and the collection page, campaigns, video and image uploads (Bunny CDN), how data is stored and protected, and how much real data exists.
3. **AI**: content generation, case studies, brand voice, auto-generation, which AI service is used and whether it works.
4. **Data and insights**: widget analytics, PostHog, Sentry, admin dashboards, and what customer insight we can realistically get from this data.
5. **Integrations**: Stripe, Shopify, WooCommerce, Gumroad, webhooks/Zapier, Google Reviews, Trustpilot, G2, WordPress, and the publishing channels (Buffer, LinkedIn, X, Mailchimp, Klaviyo, ConvertKit). For each: connects for real, is a mock-up, or is missing settings.
6. **Payments**: checkout, Stripe webhooks, plan changes, cancellation, billing page, agency billing, and whether each piece works end to end.
7. **Usage limits**: the limit on each plan (proofs, widget views, domains, team seats, storage, active widgets) and whether each limit is enforced both on screen and on the server.
8. **Agency, client portal, admin**: status of each.
9. **Background jobs and emails**: scheduled jobs, the email sender, reminders, and the sending domain.
10. **Security and health**: database security scan, open warnings, items still waiting on you.
11. **Why sign-ups are low**: problems in the sign-up and setup journey, with fixes ranked by impact and effort.
12. **Outstanding items and next steps**: one prioritized checklist.

## Method
- Read every page, shared code file and server function.
- Run read-only checks on the database: row counts, plan limits, security rules, scheduled jobs.
- Check which secrets and service keys are set (names only, never values) to tell real integrations from unfinished ones.
- Run the database security scanner.
- Click through the public pages and the sign-up flow in a test browser.
- Make no changes to the app. Fixes, including removing the internal codes, come after you review the report.

## Deliverable
`/mnt/documents/NotiProof_Audit_Report.md`, also available as a PDF, with a short summary in chat.

## Technical notes
- Signed-in screens can't be clicked through automatically on this project's setup. They will be checked from the code and the database, and the report will say so.
- Each status is backed by a specific file or query result. Anything I couldn't confirm is marked "unverified".
