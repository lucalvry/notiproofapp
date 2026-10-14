# Roadmap

- [x] Request and securely save OpenAI and Anthropic keys.
- [x] Repair dashboard and related action hover contrast.
- [x] Repair platform/email/Stripe monitoring and verify scheduled callbacks.
- [x] Validate changes and report external verification limits.
- [ ] Confirm a live Stripe delivery (user resends a recent event from the Stripe dashboard).

- [x] Move the main app navigation into an expanded-by-default collapsible sidebar.
- [x] Align the Agency workspace with the shared collapsible sidebar and mobile drawer.
- [x] Align the Admin workspace with the shared collapsible sidebar and mobile drawer.
- [x] Preserve utility controls, active states, business switching, and sign-out access.
- [x] Verify type checking and preview build health.
- [x] Store the supplied official NotiProof logo and icon as portable project assets.
- [x] Replace every product header and sidebar substitute with the official assets.
- [x] Add a permanent brand rule and verify all affected screens.
- [x] Give the official logo a white container in every signed-in sidebar state.
- [x] Generate widget snippets from the stable app.notiproof.xyz address.
- [x] Replace lucalvry.com with notiproof.xyz as the approved website, as selected.
- [x] Widget live on notiproof.xyz (confirmed by user).
- [x] Audit report v2: compare uploaded spec documents with the build; research ChatGPT/Claude/MCP.
- [x] Required sign-up questions (reason + source with follow-ups) and admin view.
- [x] Referral program: links, 20% recurring commission from Stripe, refunds reverse, payouts page and admin mark-paid.
- [ ] Add `charge.refunded` to the Stripe webhook events in the Stripe dashboard (needs the user's Stripe access).
- [ ] MCP server for ChatGPT/Claude — to run as a function on the existing Vercel host; Lovable tooling cannot build/deploy it here.
- [ ] Referral payouts via Stripe Connect — paused until the user sets up Stripe Connect.
- [x] Settings pages full width.
- [x] Admin unlimited (DB limit checks + app + "Test as plan" preview switch).
- [x] Dashboard 7/30/90/365 filter; Analytics 90d/1y/custom range.
- [x] Page tips + required-field markers.
- [x] Website required, business DNA AI, industries table, favicon, logo upload.
- [x] Guided setup checklist with import progress + approval.
- [x] Live-on-site verification (2-day not-detected).
- [x] Free-plan data history notice.
- [x] Lifecycle + win-back emails via Resend.

## Free trial (3-day live proof)
- [x] Trial helper + tests; start countdown on first impression; backfill current live Free users.
- [x] Pause popup after trial; view-only mode with upgrade popup (app + database checks).
- [x] Live countdown banner on dashboard and app layout.
- [x] Trial emails (live, day 2, day 3, paused).
- [x] Rename Free plan to "Free trial".

## Close gaps (Oct 14 plan)
- [x] Countdown appears without refresh; step 1 counts saved domains (shared rule).
- [x] Website backfilled from domains; Free trial allows 3 active widgets.
- [x] Live widget honours selected proofs, rotation, text/video filter; "Add to widget" works.
- [ ] AI business details: 3 businesses have no website; aroa.munoz.work site blocks reading (owner must fill in Settings).
- [x] Connect-flow checks: Google, WooCommerce (signature fix), Zapier.
- [ ] Shopify + Stripe connect test (needs user test store/account).
- [x] Wall of Love page (/wall/:businessId) + copy link in Proof Library.
- [x] General collection link per business (/collect/b/:businessId).
- [x] Guided setup reorder.
- [x] Layout gallery of all layouts (/widgets/gallery).
- [x] Testimonial funnel on Requests page. (Frequency cap already enforced in widget.js.)
- [x] Moderation CSV export; AI auto-tag hourly; unused admin placeholder removed.
- [x] Admin agency detail page.
