import * as Sentry from "@sentry/react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { useEffect } from "react";

const SENTRY_DSN =
  "https://2b33afb5d9bc2423e5b1b5a6940097f0@o4511574741942272.ingest.de.sentry.io/4511575015620688";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  initialized = true;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: (import.meta.env.VITE_APP_RELEASE as string) || undefined,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
      }),
    ],
    beforeSend(event, hint) {
      const err = hint?.originalException as Error | undefined;
      const msg = err?.message ?? (typeof event.message === "string" ? event.message : "");
      if (!msg) return event;
      if (/ResizeObserver loop/i.test(msg)) return null;
      if (/Non-Error promise rejection captured/i.test(msg)) return null;
      if (/AbortError|The user aborted a request/i.test(msg)) return null;
      if (/Failed to fetch/i.test(msg) && !navigator.onLine) return null;
      return event;
    },
  });
}

export { Sentry };