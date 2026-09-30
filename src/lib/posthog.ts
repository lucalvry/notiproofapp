import posthog from "posthog-js";

const POSTHOG_KEY = "phc_rw3SbndNLNB3jrERNXZF9b2fubP8RJYSn23ty7BHPueK";
const POSTHOG_HOST = "https://eu.i.posthog.com";

let initialized = false;

export function initPostHog() {
  if (initialized) return;
  if (typeof window === "undefined") return;
  initialized = true;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-sensitive]",
    },
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.debug(false);
    },
  });
}

export { posthog };