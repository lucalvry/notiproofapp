// Shared AI text generation with provider fallback: Anthropic -> OpenAI -> Lovable AI.
// Each provider failure is classified so admins see the real reason when all fail.

export type AiFailureKind = "no_key" | "no_credit" | "rate_limited" | "auth_failed" | "server_error" | "network_error" | "bad_response";

export interface ProviderFailure {
  provider: "anthropic" | "openai" | "lovable";
  kind: AiFailureKind;
  status?: number;
  detail: string;
}

export class AllProvidersFailedError extends Error {
  failures: ProviderFailure[];
  constructor(failures: ProviderFailure[]) {
    super("All AI providers failed: " + failures.map((f) => `${f.provider}: ${describeFailure(f)}`).join("; "));
    this.name = "AllProvidersFailedError";
    this.failures = failures;
  }
}

export function describeFailure(f: ProviderFailure): string {
  switch (f.kind) {
    case "no_key": return "no API key configured";
    case "no_credit": return "no AI credit / quota exhausted";
    case "rate_limited": return "rate limited";
    case "auth_failed": return "API key rejected";
    case "server_error": return `provider server error (${f.status ?? "?"})`;
    case "network_error": return "network error reaching provider";
    case "bad_response": return "empty or invalid response";
  }
}

export interface GenerateOptions {
  system: string;
  user: string;
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  provider: ProviderFailure["provider"];
  model: string;
}

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const OPENAI_MODEL = "gpt-4o-mini";
const LOVABLE_MODEL = "google/gemini-2.5-flash";

function classify(provider: ProviderFailure["provider"], status: number, body: string): ProviderFailure {
  const lower = body.toLowerCase();
  let kind: AiFailureKind = "server_error";
  if (status === 402 || lower.includes("credit") || lower.includes("insufficient_quota") || lower.includes("billing")) kind = "no_credit";
  else if (status === 429) kind = "rate_limited";
  else if (status === 401 || status === 403) kind = "auth_failed";
  return { provider, kind, status, detail: body.slice(0, 300) };
}

async function tryAnthropic(o: GenerateOptions): Promise<GenerateResult | ProviderFailure> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return { provider: "anthropic", kind: "no_key", detail: "ANTHROPIC_API_KEY missing" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: o.maxTokens ?? 1500, system: o.system, messages: [{ role: "user", content: o.user }] }),
    });
    const body = await res.text();
    if (!res.ok) return classify("anthropic", res.status, body);
    const text = JSON.parse(body).content?.[0]?.text?.trim() ?? "";
    if (!text) return { provider: "anthropic", kind: "bad_response", detail: "empty text" };
    return { text, provider: "anthropic", model: ANTHROPIC_MODEL };
  } catch (e) {
    return { provider: "anthropic", kind: "network_error", detail: String(e).slice(0, 300) };
  }
}

async function tryChatCompletions(
  provider: "openai" | "lovable", url: string, key: string | undefined, model: string, o: GenerateOptions,
): Promise<GenerateResult | ProviderFailure> {
  if (!key) return { provider, kind: "no_key", detail: `${provider === "openai" ? "OPENAI_API_KEY" : "LOVABLE_API_KEY"} missing` };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: o.maxTokens ?? 1500,
        messages: [{ role: "system", content: o.system }, { role: "user", content: o.user }],
      }),
    });
    const body = await res.text();
    if (!res.ok) return classify(provider, res.status, body);
    const text = JSON.parse(body).choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { provider, kind: "bad_response", detail: "empty text" };
    return { text, provider, model };
  } catch (e) {
    return { provider, kind: "network_error", detail: String(e).slice(0, 300) };
  }
}

function isFailure(r: GenerateResult | ProviderFailure): r is ProviderFailure {
  return (r as ProviderFailure).kind !== undefined;
}

/** Try Anthropic, then OpenAI, then Lovable AI. Throws AllProvidersFailedError with every reason. */
export async function generateText(o: GenerateOptions): Promise<GenerateResult> {
  const failures: ProviderFailure[] = [];
  const attempts = [
    () => tryAnthropic(o),
    () => tryChatCompletions("openai", "https://api.openai.com/v1/chat/completions", Deno.env.get("OPENAI_API_KEY"), OPENAI_MODEL, o),
    () => tryChatCompletions("lovable", "https://ai.gateway.lovable.dev/v1/chat/completions", Deno.env.get("LOVABLE_API_KEY"), LOVABLE_MODEL, o),
  ];
  for (const attempt of attempts) {
    const r = await attempt();
    if (!isFailure(r)) return r;
    console.warn(`[ai] ${r.provider} failed: ${r.kind} ${r.status ?? ""}`);
    failures.push(r);
  }
  throw new AllProvidersFailedError(failures);
}

/** Record a failed AI job so admins can see exact reasons and retry it later. Never throws. */
// deno-lint-ignore no-explicit-any
export async function recordAiFailure(admin: any, args: { business_id?: string | null; user_id?: string | null; task: string; payload: unknown; error: AllProvidersFailedError }) {
  try {
    const { data } = await admin.from("ai_job_failures").insert({
      business_id: args.business_id ?? null,
      user_id: args.user_id ?? null,
      task: args.task,
      payload: args.payload ?? {},
      provider_errors: args.error.failures.map((f) => ({ provider: f.provider, kind: f.kind, status: f.status ?? null, reason: describeFailure(f) })),
      status: "pending",
    }).select("id").single();
    return data?.id as string | undefined;
  } catch (e) {
    console.error("[ai] could not record failure", e);
    return undefined;
  }
}
