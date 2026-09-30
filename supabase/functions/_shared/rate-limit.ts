// Ad-hoc Postgres-backed rate limiter. Service role only.
// Wraps the public.check_rate_limit RPC.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

let _client: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  return _client;
}

export interface RateLimitOptions {
  /** Stable key. Include endpoint + caller identity (ip / user / business / token). */
  key: string;
  /** Max requests permitted in the window. */
  max: number;
  /** Window length in seconds. */
  windowSec: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number;
}

/** Return the first non-empty IP from x-forwarded-for, falling back to "anon". */
export function callerIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anon";
}

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  try {
    const { data, error } = await admin().rpc("check_rate_limit", {
      _key: opts.key,
      _max: opts.max,
      _window_seconds: opts.windowSec,
    });
    if (error) {
      // Fail-open on infra errors so a broken limiter doesn't take down the app,
      // but log it so we notice.
      console.error("rate-limit infra error", error.message);
      return { ok: true, retryAfter: 0 };
    }
    if (data === false) return { ok: false, retryAfter: opts.windowSec };
    return { ok: true, retryAfter: 0 };
  } catch (e) {
    console.error("rate-limit threw", e);
    return { ok: true, retryAfter: 0 };
  }
}

/** Convenience: build a 429 Response. */
export function tooMany(corsHeaders: Record<string, string>, retryAfter: number) {
  return new Response(
    JSON.stringify({ error: "rate_limited", retry_after: retryAfter }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}
