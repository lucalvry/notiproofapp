# Fix: sign-up questions pop-up can't be submitted

## What's wrong
The pop-up does have a "Continue" button, but on normal laptop screens (like yours, ~716px tall) the questions and follow-up fields push it below the bottom of the screen, and the pop-up can't scroll. So users can't reach it. Also, if saving fails, nothing tells the user why.

## Fix
1. Make the pop-up fit any screen: limit its height to the screen and let the questions area scroll, with the "Continue" button pinned at the bottom so it is always visible.
2. Keep it required (no close button), but show a short hint under the button saying which answer is still missing, so the button never looks "dead".
3. If saving fails, show a clear error message and let the user try again instead of silently doing nothing.
4. Pop-up closes as soon as answers are saved.

## Confirm answers reach the admin
- Check in the database that saved answers land in the sign-up answers record (reason, other-reason, source, source details, referral code).
- Confirm Admin → Sign-ups & referrals lists each person's answers (not just totals); if it only shows totals, add a list of recent answers with the person's email, date, reason, source and details.
- Test the pop-up at your screen size in a browser: answer, submit, see it close.

## Technical details
- `AttributionGate.tsx`: `DialogContent` gets `max-h-[90vh] flex flex-col`, fields wrapped in `overflow-y-auto`, button in a fixed footer; toast on RPC error; display `attributionError` text.
- Verify `record_signup_attribution` RPC succeeds for an existing user and `admin/Growth.tsx` shows per-user rows (add an admin-only list via existing admin RLS if missing).
