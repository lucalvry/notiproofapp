// Cron-invoked: adds an AI summary, tags and sentiment to new proofs that don't have one yet.
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateText, recordAiFailure, AllProvidersFailedError } from "../_shared/ai.ts";
import { recordInvocation } from "../_shared/monitoring.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BATCH = 10;

function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  const started = Date.now();
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const { data: sec } = await admin.from("app_secrets").select("value").eq("name", "dispatch_cron_secret").maybeSingle();
  if (!(safeEq(bearer, SERVICE_ROLE) || (sec?.value && safeEq(bearer, sec.value as string)))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { data: rows } = await admin
    .from("proof_objects")
    .select("id, business_id, content, rating, tags")
    .is("ai_summary", null)
    .not("content", "is", null)
    .order("created_at", { ascending: false })
    .limit(BATCH);

  let done = 0, failed = 0;
  for (const p of rows ?? []) {
    try {
      const r = await generateText({
        system: "You label customer testimonials. Reply with JSON only: {\"summary\": string (max 20 words), \"tags\": string[] (2-5 short lowercase topics), \"sentiment\": number between -1 and 1}.",
        user: `Rating: ${p.rating ?? "none"}\nTestimonial: ${String(p.content).slice(0, 4000)}`,
        maxTokens: 300,
      });
      const m = r.text.match(/\{[\s\S]*\}/);
      const j = m ? JSON.parse(m[0]) : null;
      if (!j?.summary) throw new Error("bad_json");
      const tags = Array.from(new Set([...(p.tags ?? []), ...((j.tags ?? []) as string[]).map((t) => String(t).toLowerCase().slice(0, 40))])).slice(0, 12);
      await admin.from("proof_objects").update({
        ai_summary: String(j.summary).slice(0, 300),
        tags,
        sentiment_score: typeof j.sentiment === "number" ? Math.max(-1, Math.min(1, j.sentiment)) : null,
      }).eq("id", p.id);
      done++;
    } catch (e) {
      failed++;
      if (e instanceof AllProvidersFailedError) {
        await recordAiFailure(admin, { business_id: p.business_id, task: "ai-tag-proofs", payload: { proof_id: p.id }, error: e });
        break; // providers down — stop this run
      }
      // Unparseable answer: mark so we don't loop on it forever.
      await admin.from("proof_objects").update({ ai_summary: "" }).eq("id", p.id);
    }
  }

  await recordInvocation(admin, "ai-tag-proofs", started, failed && !done ? "error" : "ok", { done, failed });
  return new Response(JSON.stringify({ done, failed }), { headers: { "Content-Type": "application/json" } });
});
