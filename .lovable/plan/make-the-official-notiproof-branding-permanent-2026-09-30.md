# Make the official NotiProof branding permanent

## Use the supplied originals
- Add the attached `NotiProof_Logo.png` and `NutiProof_Icon.png` directly to the project as permanent, source-controlled brand assets.
- Do not place either file in Lovable Assets or any account-bound storage, so they remain available when the project moves to another Lovable account.
- Use the complete supplied logo image anywhere the full NotiProof logo is required. Never reconstruct the wordmark with styled text.
- Use the supplied bell/check icon anywhere an icon-only mark is required. Never substitute a letter badge or improvised symbol.

## Fix every signed-in sidebar
- Main, Agency, and Admin sidebars show the complete supplied logo while expanded.
- Collapsed sidebars show the supplied icon only.
- Mobile drawers follow the same expanded-logo treatment.
- Preserve the current navigation, sidebar sizing, collapse controls, and destination links.

## Centralize and protect the brand
- Create one shared NotiProof brand component with explicit full-logo and icon-only variants, then use it in all three sidebars.
- Replace other manually typed NotiProof header wordmarks with that shared component where they represent the product logo, including sign-in and onboarding headers.
- Record a permanent project rule: only these supplied assets may represent the NotiProof brand; generated text logos, letter badges, and recreated icons are forbidden.
- Keep the files in a clearly named local brand-assets folder and add descriptive alternative text plus fixed dimensions.

## Browser icon
- Derive the site favicon from the supplied official icon, preserving its proportions and replacing the older icon file cleanly.

## Verification
- Check the full and collapsed sidebar states across the main app, Agency, and Admin workspaces, plus the sign-in and onboarding headers.
- Confirm both official images load from project-local paths, remain sharp and proportionate, and cause no browser or build errors.

## Technical details
- The current three sidebars each contain a handwritten `N` badge and a text-built wordmark.
- The sign-in and onboarding layouts also build the wordmark from text; centralizing all product-brand rendering prevents future drift.
- The uploaded files are the source of truth; the existing favicon is not treated as a replacement for either supplied asset.
