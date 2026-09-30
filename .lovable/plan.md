# Sidebar logo treatment and website widget recovery

## Confirmed findings

- The login and signup logo sits on a white background, while the three signed-in sidebars place the same supplied artwork directly on the navy sidebar.
- The current `https://notiproof.xyz` homepage does not contain a NotiProof widget script.
- `https://notiproof.xyz/widget.js` returns “not found”; the working script is available at `https://app.notiproof.xyz/widget.js`.
- The active NotiProof widget and eight approved proofs return correctly for its currently verified domain, `lucalvry.com`.
- A request for that widget from `notiproof.xyz` is rejected by the domain allowlist, and no widget impressions have been recorded.

## Changes

1. **Give every sidebar logo the established white treatment**
   - Wrap the supplied full NotiProof logo in the same compact white, lightly rounded background used on the login/signup pages.
   - Apply it consistently in the main app, Agency, and Admin sidebars, including mobile drawers.
   - When a sidebar is collapsed, show only the supplied NotiProof icon in a proportionate white square; never recreate the brand with text or another symbol.

2. **Make generated widget snippets use one stable public address**
   - Replace page-dependent widget addresses with `https://app.notiproof.xyz/widget.js` in onboarding and the widget editor, so copied snippets work on external websites and never point to the preview or the marketing site’s missing file.
   - Keep the existing business and widget identifiers in each generated snippet.

3. **Allow the confirmed website to display the active widget**
   - Add `notiproof.xyz` as a verified domain for the NotiProof business without removing the existing `lucalvry.com` entry.
   - Keep the existing domain protection for all other websites.

4. **Complete the external installation**
   - Provide the exact corrected snippet for `notiproof.xyz` after the fix.
   - Because the marketing website is separate from this app and its current HTML contains no widget script, the snippet must be added there through that site’s own editor or deployment workflow.

5. **Verify the complete path**
   - Confirm the stable script returns JavaScript successfully.
   - Confirm the public widget response for `notiproof.xyz` includes the active popup and approved proof.
   - Run the widget in a browser test using the corrected snippet and verify a visible notification appears and records an impression.
   - Check the three sidebar states at desktop and mobile sizes, then confirm the app still builds cleanly.

## Technical details

- Reuse the existing semantic background token for the white logo containers, rather than adding a hardcoded color.
- The corrected script source will be `https://app.notiproof.xyz/widget.js`; Bunny’s default upload hostname remains unchanged.
- No proof content, widget styling, frequency settings, or existing verified domains will be removed.
