# Collapsible side navigation

## Goal
Move signed-in workspace navigation from the header into a consistent left sidebar across the main app, Agency, and Admin areas.

## User experience
- The sidebar is expanded by default so every destination remains clearly labeled.
- A visible control collapses it to a narrow icon strip; icons remain available with tooltips for their names.
- The current page stays highlighted, and the selected section remains clear in either state.
- Business switching and workspace identity sit near the top of the relevant sidebar.
- Settings, billing, team, account access, and sign-out remain easy to reach without duplicating navigation.
- The top header becomes a slim utility bar for the sidebar control, notifications, and user menu rather than primary navigation.
- On phones and small tablets, navigation opens as a left drawer and closes after a destination is selected.

## Scope
1. **Main app** — move Dashboard, Proof, Content, Campaigns, Case Studies, Widgets, Integrations, Analytics, and account destinations into the sidebar.
2. **Agency workspace** — upgrade the existing fixed sidebar to the same expandable/collapsible behavior and add a usable mobile drawer.
3. **Admin workspace** — retain its existing side-navigation structure while aligning collapse behavior, spacing, active states, and mobile handling with the other workspaces.
4. Preserve existing permissions, business switching, impersonation notices, notification access, routing, and sign-out behavior.

## Technical details
- Use the existing sidebar design-system components with an icon-collapse mode and an always-visible header trigger.
- Keep route-aware active states and semantic color tokens from the current NotiProof design system.
- Share the common navigation shell behavior where practical while retaining each workspace's distinct links and controls.
- Ensure content fills the remaining width without horizontal overflow in expanded, collapsed, and mobile states.
- Record the shared signed-in navigation-shell decision in the project architecture notes.

## Verification
- Check the main, Agency, and Admin navigation in expanded and icon-only states.
- Confirm active links, business switching, notifications, user menu, Admin return-to-app, and sign-out still work.
- Check the mobile drawer and content layout at phone, tablet, and desktop widths.
- Confirm the preview builds without errors and no navigation labels or page content overlap.
