# Restore the original NotiProof logo permanently

## Fix
- Replace the handmade “N” badge in the main, agency, and admin sidebars with the original blue NotiProof checkmark asset imported with the project.
- Keep the existing NotiProof name beside the mark when the sidebar is expanded; show the original mark by itself when collapsed.
- Preserve the current sidebar sizing, navigation, mobile drawer behavior, and destination links.

## Prevent recurrence
- Create one shared NotiProof brand component and make every signed-in sidebar use it, rather than maintaining separate logo markup.
- Record the original imported asset as the required product mark in the project rules, explicitly forbidding letter badges, improvised marks, and recreated substitutes.
- Add accessible image text and stable dimensions so the logo remains clear without shifting the sidebar.

## Verification
- Check expanded, collapsed, and mobile sidebar states for the main app, Agency, and Admin workspaces.
- Confirm the original image loads, links correctly, and introduces no browser or build errors.

## Technical details
- The current sidebar files each contain the same handwritten `N` element.
- The imported archive contains the official blue checkmark artwork as `public/favicon.png`; no separate full wordmark asset is present.
- Centralizing the sidebar branding removes the three independent copies that allowed the wrong mark to be introduced.
