// Minimal Sentry helper for edge functions. Sends an exception envelope
// directly over HTTP so we avoid pulling a heavy SDK into every function.
// Reads SENTRY_EDGE_DSN; no-ops if unset.

const DSN = Deno.env.get("SENTRY_EDGE_DSN");

interface ParsedDsn {
  publicKey: string;
  host: string;
  projectId: string;
  protocol: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\/+/, "");
    if (!projectId || !u.username) return null;
    return {
      publicKey: u.username,
      host: u.host,
      projectId,
      protocol: u.protocol.replace(":", ""),
    };
  } catch {
    return null;
  }
}

const PARSED = DSN ? parseDsn(DSN) : null;

export interface EdgeErrorContext {
  function_name?: string;
  business_id?: string | null;
  user_id?: string | null;
  extra?: Record<string, unknown>;
}

export async function captureEdgeError(
  err: unknown,
  req?: Request,
  ctx: EdgeErrorContext = {},
): Promise<void> {
  if (!PARSED) return;

  const error = err instanceof Error ? err : new Error(String(err));
  const url = req ? new URL(req.url) : null;

  const payload = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: "error",
    server_name: ctx.function_name ?? url?.pathname.split("/").filter(Boolean).pop() ?? "edge",
    environment: Deno.env.get("SUPABASE_ENV") ?? "production",
    tags: {
      runtime: "deno",
      function: ctx.function_name ?? url?.pathname.split("/").filter(Boolean).pop() ?? "edge",
      ...(ctx.business_id ? { business_id: ctx.business_id } : {}),
    },
    user: ctx.user_id ? { id: ctx.user_id } : undefined,
    request: req
      ? {
          url: req.url,
          method: req.method,
          headers: { "user-agent": req.headers.get("user-agent") ?? "" },
        }
      : undefined,
    exception: {
      values: [
        {
          type: error.name || "Error",
          value: error.message,
          stacktrace: error.stack
            ? {
                frames: error.stack
                  .split("\n")
                  .slice(1)
                  .map((line) => ({ filename: line.trim() }))
                  .reverse(),
              }
            : undefined,
        },
      ],
    },
    extra: ctx.extra,
  };

  const endpoint = `${PARSED.protocol}://${PARSED.host}/api/${PARSED.projectId}/store/`;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": [
          "Sentry sentry_version=7",
          "sentry_client=notiproof-edge/1.0",
          `sentry_key=${PARSED.publicKey}`,
        ].join(", "),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Never let monitoring break the request.
  }
}