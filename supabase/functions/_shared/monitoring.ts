// Only allow-listed operational metadata is recorded; never persist request bodies or headers.
export async function recordInvocation(admin: any, functionName: string, started: number, status: "ok" | "error", metadata: Record<string, unknown> = {}, reason?: string) {
  const { error } = await admin.from("ef_invocation_log").insert({
    function_name: functionName, status: status === "ok" ? "success" : "error", duration_ms: Date.now() - started,
    error_message: reason ?? null, metadata,
  });
  if (error) throw new Error("Could not save monitoring result");
}

// Scheduled callers use their existing internal secret; manual runs require a real admin JWT.
export async function authorizeMonitor(req: Request, admin: any): Promise<boolean> {
  const expected = Deno.env.get("INTERNAL_TRIGGER_SECRET");
  if (expected && req.headers.get("x-internal-secret") === expected) return true;
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return false;
  const token = authorization.slice(7);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return false;
  const { createClient } = await import("npm:@supabase/supabase-js@2");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return false;
  const userClient = createClient(url, key, { global: { headers: { Authorization: authorization } } });
  const result = await userClient.rpc("is_platform_admin");
  return !result.error && result.data === true;
}

export function stripeDeliveryState(lastVerified: string | null, recentFailures: number): "unverified" | "healthy" | "failed" {
  if (recentFailures > 0) return "failed";
  return lastVerified ? "healthy" : "unverified";
}

export function heartbeatStale(lastRun: string | null, now = Date.now()): boolean {
  return !lastRun || new Date(lastRun).getTime() < now - 25 * 60 * 1000;
}