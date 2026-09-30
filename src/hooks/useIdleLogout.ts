import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_KEY = "notiproof.last_activity_at";
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

/**
 * Signs the user out after IDLE_TIMEOUT_MS of inactivity.
 * Activity is shared across tabs via localStorage, so any tab's
 * activity resets the idle clock for every open tab.
 */
export function useIdleLogout() {
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    const performLogout = async () => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      try {
        localStorage.removeItem(ACTIVITY_KEY);
        await supabase.auth.signOut();
      } finally {
        navigate("/login?reason=idle", { replace: true });
      }
    };

    const scheduleLogout = (remainingMs: number) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        // Re-check the shared activity stamp before logging out — another tab
        // may have registered activity in the meantime.
        const last = Number(localStorage.getItem(ACTIVITY_KEY) || 0);
        const elapsed = Date.now() - last;
        if (elapsed >= IDLE_TIMEOUT_MS) {
          void performLogout();
        } else {
          scheduleLogout(IDLE_TIMEOUT_MS - elapsed);
        }
      }, Math.max(remainingMs, 1000));
    };

    const recordActivity = () => {
      const now = Date.now();
      localStorage.setItem(ACTIVITY_KEY, String(now));
      scheduleLogout(IDLE_TIMEOUT_MS);
    };

    // Initialize: if no stamp yet, set one. Otherwise resume from existing.
    const existing = Number(localStorage.getItem(ACTIVITY_KEY) || 0);
    if (!existing) {
      recordActivity();
    } else {
      const elapsed = Date.now() - existing;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        void performLogout();
        return;
      }
      scheduleLogout(IDLE_TIMEOUT_MS - elapsed);
    }

    // Throttle activity writes to once per 5s to avoid storage spam.
    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 5000) return;
      lastWrite = now;
      recordActivity();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_KEY && e.newValue) {
        scheduleLogout(IDLE_TIMEOUT_MS);
      }
    };

    const onVisibility = async () => {
      if (document.visibilityState !== "visible") return;
      // Validate session is still live when tab regains focus.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/login?reason=expired", { replace: true });
        return;
      }
      const last = Number(localStorage.getItem(ACTIVITY_KEY) || 0);
      if (last && Date.now() - last >= IDLE_TIMEOUT_MS) {
        void performLogout();
      }
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true })
    );
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, onActivity)
      );
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [navigate]);
}
