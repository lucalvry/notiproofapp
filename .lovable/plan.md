# Finish-up: health check, security tidy-up, slower scheduled job, new CDN address

## 0. Check first
- Check the database is healthy and the preview app has no errors.
- Confirm the current schedule, the upload settings and any saved image links before changing anything.

## 1. Security warnings (from your attached notes)
- Stop signed-out visitors from calling the admin dashboard tools and the accept-invite step.
- Stop signed-in users from calling internal-only background helpers, including the request-limit check.
- Before closing each one, confirm nothing in the app calls it directly.
- The public testimonial and invite-preview functions stay open.
- You turn on leaked-password protection yourself in the Supabase dashboard (Authentication -> Password security).

## 2. Scheduled job: every 2 minutes, skip when idle
- Change the timer from every minute to every 2 minutes.
- The job first checks whether anything is due and stops right away if nothing is.
- Testimonial emails that are due still go out, up to 2 minutes later.
- Delete scheduled-task history older than 7 days, and add a nightly clean-up so it stays small.

## 3. Bunny CDN: cdn.notiproof.xyz
- New uploads use `cdn.notiproof.xyz`. You'll enter this in a secure form.
- Upload the updated widget script after the size and syntax checks.
- Test: upload one image and confirm it loads from the new address.

## 4. Remaining notiproof.xyz links and login messages
- Check the app for any leftover `notiproof.com` links (sign-in redirects, Terms, Privacy, Contact, support email) and update them.
- Make sure Login, Register, Forgot password and Reset password show a clear message when the sign-in service can't be reached.

## 5. Customer notice (later)
- No banner or email for now. When you're ready, I'll draft the "update your widget snippet" email.

## Technical details
- Migration: `REVOKE EXECUTE ... FROM anon` on the admin_* functions and accept_agency_team_invitation. `REVOKE ... FROM authenticated, anon, public` on the trigger and maintenance helpers and check_rate_limit. Keep `service_role`. Before revoking, rg `src/` and `supabase/functions` for `.rpc('<name>')`.
- Cron: `cron.alter_job` on `dispatch-scheduled-jobs-every-minute` with schedule `*/2 * * * *`. Add an early `select id ... limit 1` on due jobs in the function and return early when none are found. Delete rows in `cron.job_run_details` older than 7 days, plus a daily job that does the same.
- Secret: set `BUNNY_CDN_HOSTNAME` with update_secret, then redeploy `bunny-upload-url`.
- Verify with the linter, the build log and a Playwright login run plus a test upload.
