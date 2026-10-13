<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All signed-in workspaces use the shared collapsible sidebar shell, expanded by default with icon-only collapse, so navigation remains consistent and accessible.
- Only the supplied NotiProof logo and icon assets may represent the product brand; never recreate the logo with text or substitute a letter badge, so branding stays exact and portable.
- Generate every external widget snippet from the canonical app URL in `src/lib/app-url.ts`, so copied installs never depend on a preview or marketing-site origin.
- Referral commission math lives in `src/lib/referrals.ts` (tested) and is mirrored in `supabase/functions/_shared/referral-commission.ts`; change both together so client display and Stripe-webhook payouts never drift.
- Sign-up attribution is written only through the `record_signup_attribution` RPC, and `AttributionGate` asks any signed-in user still missing it, so OAuth and email-confirm sign-ups can't skip the questions.
