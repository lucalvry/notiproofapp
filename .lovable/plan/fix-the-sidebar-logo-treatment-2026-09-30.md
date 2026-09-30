# Fix the sidebar logo treatment

## Confirmed issue

- All three signed-in sidebars already use the shared official NotiProof brand component.
- Its intended white container is currently clipped because it is 40px tall inside a 36px-high link.
- The container uses the general page-background color, which changes with the theme and therefore does not guarantee the required white logo backing.

## Changes

1. Add a dedicated semantic brand-surface color that remains white in both light and dark themes.
2. Update the shared sidebar brand component to use that permanent white surface, with sizing that fits fully inside the sidebar header.
3. Keep the supplied full logo in expanded and mobile sidebars, and the supplied icon in collapsed sidebars.
4. Align the logo link dimensions consistently in the main, Agency, and Admin sidebars so no part of the white rectangle is clipped.

## Verification

- Check expanded, collapsed, and mobile sidebar states in the main workspace.
- Confirm the same shared treatment is wired into Agency and Admin sidebars.
- Verify the official image assets load, the white backing is visibly distinct from the navy sidebar, and the app remains error-free.

## Technical details

- The white backing will be represented by a semantic design token rather than a hardcoded component color.
- Navigation, sidebar behavior, logo assets, and all non-brand content remain unchanged.
