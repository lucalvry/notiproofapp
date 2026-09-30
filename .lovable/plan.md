## Goal
Add production-grade error monitoring (Sentry) and product analytics (PostHog) to the Notiproof app, with values hardcoded in source so nothing breaks on project migration.

## Confirmed values (hardcoded, no .env)
- Sentry frontend DSN: `https://2b33afb5d9bc2423e5b1b5a6940097f0@o4511574741942272.ingest.de.sentry.io/4511575015620688`
- Sentry org slug: `notiproof`
- Sentry frontend project: `notiproof-web`
- Sentry edge project: `notiproof-edge` (DSN read at runtime from Supabase secret `SENTRY_EDGE_DSN`)
- PostHog key: `phc_rw3SbndNLNB3jrERNXZF9b2fubP8RJYSn23ty7BHPueK`
- PostHog host: `https://eu.i.posthog.com` (assumed EU since Sentry is `.de`; flip to `us.i.posthog.com` if your PostHog project is US — one-line change)

## Secrets (handled separately, not in repo)
- `SENTRY_AUTH_TOKEN` (`sntryu_…`) → Workspace Settings → Build Secrets, used by `@sentry/vite-plugin` for sourcemap upload + release tagging. If absent, the plugin no-ops; app still works.
- `SENTRY_EDGE_DSN` → Supabase Edge Function secret, already in your project.

## What gets built

### 1. Frontend Sentry (`@sentry/react` + `@sentry/vite-plugin`)
- Init in `src/main.tsx` before React mounts.
- `tracesSampleRate: 0.1`, `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0`.
- `browserTracingIntegration` + `replayIntegration({ maskAllText: false, maskAllInputs: true, blockAllMedia: false })`.
- React Router v6 instrumentation.
- `beforeSend` filter: drop `ResizeObserver`, network aborts, and known noisy errors.
- `Sentry.ErrorBoundary` wrapping `<App />` with a minimal fallback UI.
- Release tagging via Vite plugin (only runs when `SENTRY_AUTH_TOKEN` present).

### 2. Frontend PostHog (`posthog-js`)
- Init alongside Sentry in `src/main.tsx`.
- `autocapture: true`, `capture_pageview: false` (manual via tracker), `session_recording: { maskAllInputs: true, maskTextSelector: '[data-sensitive]' }`.
- `<PostHogPageviewTracker />` mounted inside `<BrowserRouter>` → fires `$pageview` on route change.
- `src/lib/analytics.ts` helper: `track()`, `identify()`, `reset()`, `isFeatureEnabled()`, `useFeatureFlag()` hook.
- ~8 key events instrumented: `signup_completed`, `onboarding_step_completed`, `widget_published`, `proof_collected`, `content_generated`, `content_published`, `campaign_created`, `case_study_created`.

### 3. User identification + admin/impersonation exclusion
- Hook into `AuthContext`:
  - On session resolve → if `profile.is_admin === true` OR `impersonation` is set → call `posthog.opt_out_capturing()` and `Sentry.setUser(null)` (still allow Sentry error capture but tagged `internal: true`).
  - Otherwise → `Sentry.setUser({ id, email })` and `posthog.identify(id, { email, business_id })`.
- On sign-out → `Sentry.setUser(null)` + `posthog.reset()`.

### 4. Edge function Sentry
- New `supabase/functions/_shared/sentry.ts` exporting `withSentry(handler)` using `https://deno.land/x/sentry/index.mjs`.
- Reads `SENTRY_EDGE_DSN`; no-op if unset.
- Wraps the 5 highest-traffic functions:
  - `track-widget-event`
  - `submit-testimonial`
  - `generate-content`
  - `publish-content`
  - `stripe-webhook`
- Captures unhandled errors with request context (path, method, business_id when available); preserves existing CORS + response shape.

### 5. Build config
- `vite.config.ts`: add `sentryVitePlugin({ org: 'notiproof', project: 'notiproof-web', authToken: process.env.SENTRY_AUTH_TOKEN, disable: !process.env.SENTRY_AUTH_TOKEN })` to plugins array.

## Files touched
- `package.json` (add `@sentry/react`, `@sentry/vite-plugin`, `posthog-js`)
- `vite.config.ts`
- `src/main.tsx`
- `src/App.tsx` (wrap with `Sentry.ErrorBoundary`, mount pageview tracker)
- `src/contexts/AuthContext.tsx` (identify / reset / opt-out hooks)
- `src/lib/analytics.ts` (new)
- `src/lib/sentry.ts` (new, init + config)
- `src/lib/posthog.ts` (new, init + config)
- `src/components/analytics/PostHogPageviewTracker.tsx` (new)
- `supabase/functions/_shared/sentry.ts` (new)
- 5 edge functions above (one-line `withSentry` wrap each)

## Out of scope
- Sentry cron monitoring, custom alert rules
- PostHog data-warehouse export, experiments framework
- Any new UI surfacing analytics to end-users

## Verification after build
- Hard reload preview → confirm Sentry + PostHog init in console (no errors).
- Trigger a thrown error in a dev-only button → confirm it lands in Sentry.
- Navigate routes → confirm `$pageview` events in PostHog Live Events.
- Log in as admin → confirm `posthog.has_opted_out_capturing() === true`.

Reply **go** to build, or tell me to flip PostHog to US first.