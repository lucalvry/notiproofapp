// PUB-01 dispatcher: publishes a single content piece to a single channel.
// Triggered immediately from the publish modal AND from the dispatch-scheduled-jobs
// cron when a content_publish_event becomes due.
import { createClient } from "npm:@supabase/supabase-js@2";
import { decryptJson, piiEncryptionEnabled } from "../_shared/pii-crypto.ts";
import { captureEdgeError } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface PublishResult {
  external_post_url?: string | null;
  raw?: unknown;
}

async function publishToProvider(
  provider: string,
  creds: Record<string, string | undefined>,
  channelConfig: Record<string, unknown>,
  content: string,
  options: Record<string, unknown>,
): Promise<PublishResult> {
  switch (provider) {
    case "buffer": {
      if (!creds.access_token) throw new Error("Buffer access token missing");
      const profileIds = (options.profile_ids as string[] | undefined)
        ?? (channelConfig.profile_ids as string[] | undefined)
        ?? [];
      if (!profileIds.length) throw new Error("Select at least one Buffer profile");
      const params = new URLSearchParams({ text: content });
      for (const id of profileIds) params.append("profile_ids[]", id);
      params.set("access_token", creds.access_token);
      const res = await fetch("https://api.bufferapp.com/1/updates/create.json", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const out = await res.json();
      if (!res.ok || out?.success === false) throw new Error(out?.message ?? `Buffer ${res.status}`);
      const updateId = out?.updates?.[0]?.id;
      return { external_post_url: updateId ? `https://buffer.com/app/updates/${updateId}` : null, raw: out };
    }

    case "mailchimp": {
      const apiKey = creds.api_key;
      if (!apiKey) throw new Error("Mailchimp API key missing");
      const dc = apiKey.split("-")[1];
      if (!dc) throw new Error("Invalid Mailchimp API key (no datacenter)");
      const listId = (options.list_id as string | undefined) ?? (channelConfig.list_id as string | undefined);
      const fromEmail = (channelConfig.from_email as string | undefined) ?? creds.from_email;
      const fromName = (channelConfig.from_name as string | undefined) ?? "Notifications";
      const subject = (options.subject as string | undefined) ?? "New from your team";
      if (!listId) throw new Error("Mailchimp list_id required");
      if (!fromEmail) throw new Error("Mailchimp from_email required");

      const auth = "Basic " + btoa(`anystring:${apiKey}`);
      const base = `https://${dc}.api.mailchimp.com/3.0`;
      const createRes = await fetch(`${base}/campaigns`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "regular",
          recipients: { list_id: listId },
          settings: { subject_line: subject, from_name: fromName, reply_to: fromEmail, title: subject },
        }),
      });
      const camp = await createRes.json();
      if (!createRes.ok) throw new Error(camp?.detail ?? `Mailchimp ${createRes.status}`);

      await fetch(`${base}/campaigns/${camp.id}/content`, {
        method: "PUT",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ html: `<div>${content.replace(/\n/g, "<br/>")}</div>`, plain_text: content }),
      });

      const sendRes = await fetch(`${base}/campaigns/${camp.id}/actions/send`, {
        method: "POST",
        headers: { Authorization: auth },
      });
      if (!sendRes.ok && sendRes.status !== 204) {
        const err = await sendRes.json().catch(() => ({}));
        throw new Error(err?.detail ?? `Mailchimp send ${sendRes.status}`);
      }
      return { external_post_url: `https://${dc}.admin.mailchimp.com/campaigns/edit?id=${camp.web_id}`, raw: camp };
    }

    case "klaviyo": {
      const apiKey = creds.api_key;
      if (!apiKey) throw new Error("Klaviyo API key missing");
      const listId = (options.list_id as string | undefined) ?? (channelConfig.list_id as string | undefined);
      const fromEmail = (channelConfig.from_email as string | undefined) ?? creds.from_email;
      const fromLabel = (channelConfig.from_name as string | undefined) ?? "Notifications";
      const subject = (options.subject as string | undefined) ?? "Update from us";
      if (!listId) throw new Error("Klaviyo list_id (audience) required");
      if (!fromEmail) throw new Error("Klaviyo from_email required");

      const headers = {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: "2024-10-15",
        "Content-Type": "application/json",
        accept: "application/json",
      };
      const html = `<div style="font-family:sans-serif;line-height:1.5">${content.replace(/\n/g, "<br/>")}</div>`;

      // 1. Create template with the rendered content
      const tplRes = await fetch("https://a.klaviyo.com/api/templates/", {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: {
            type: "template",
            attributes: { name: `notifications-${Date.now()}`, editor_type: "CODE", html, text: content },
          },
        }),
      });
      const tpl = await tplRes.json();
      if (!tplRes.ok) throw new Error(tpl?.errors?.[0]?.detail ?? `Klaviyo template ${tplRes.status}`);
      const templateId = tpl?.data?.id;

      // 2. Create campaign with one message referencing the template
      const campRes = await fetch("https://a.klaviyo.com/api/campaigns/", {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: {
            type: "campaign",
            attributes: {
              name: subject,
              audiences: { included: [listId] },
              send_strategy: { method: "immediate" },
              "campaign-messages": {
                data: [{
                  type: "campaign-message",
                  attributes: {
                    channel: "email",
                    label: subject,
                    content: { subject, from_email: fromEmail, from_label: fromLabel, template_id: templateId },
                  },
                }],
              },
            },
          },
        }),
      });
      const camp = await campRes.json();
      if (!campRes.ok) throw new Error(camp?.errors?.[0]?.detail ?? `Klaviyo campaign ${campRes.status}`);
      return { external_post_url: null, raw: { template: tpl, campaign: camp } };
    }

    case "convertkit": {
      const apiKey = creds.api_key;
      const apiSecret = creds.api_secret ?? creds.api_key;
      if (!apiSecret) throw new Error("ConvertKit api_secret missing");
      const subject = (options.subject as string | undefined) ?? "Update from us";
      const res = await fetch("https://api.convertkit.com/v3/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_secret: apiSecret,
          subject,
          content: `<div>${content.replace(/\n/g, "<br/>")}</div>`,
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.message ?? `ConvertKit ${res.status}`);
      const broadcastId = out?.broadcast?.id;
      return {
        external_post_url: broadcastId ? `https://app.convertkit.com/broadcasts/${broadcastId}` : null,
        raw: out,
      };
    }

    case "linkedin": {
      const accessToken = creds.access_token;
      const author = creds.author_urn ?? channelConfig.author_urn;
      if (!accessToken || !author) throw new Error("LinkedIn not configured");
      const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: content },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": (options.visibility as string) ?? "PUBLIC" },
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.message ?? `LinkedIn ${res.status}`);
      return { external_post_url: out?.id ? `https://www.linkedin.com/feed/update/${out.id}` : null, raw: out };
    }

    case "twitter": {
      const bearer = creds.access_token;
      if (!bearer) throw new Error("Twitter access_token missing");
      const res = await fetch("https://api.x.com/2/tweets", {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: content.slice(0, 280) }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.detail ?? out?.title ?? `Twitter ${res.status}`);
      const id = out?.data?.id;
      return { external_post_url: id ? `https://x.com/i/status/${id}` : null, raw: out };
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json().catch(() => ({}));
    const eventId = body?.event_id as string | undefined;
    const piecePayload = body?.content_piece_id as string | undefined;
    const channelPayload = body?.channel_id as string | undefined;
    const options = (body?.options as Record<string, unknown>) ?? {};

    // Auth: either a signed-in user with business membership, or service role
    // (used by dispatch-scheduled-jobs).
    const auth = req.headers.get("Authorization") ?? "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const isServiceRole = !!SERVICE_ROLE && timingSafeEqual(bearer, SERVICE_ROLE);

    let userId: string | null = null;
    if (!isServiceRole) {
      if (!auth) return json({ error: "Authentication required" }, 401);
      const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
      const { data, error } = await authed.auth.getUser();
      if (error || !data.user) return json({ error: "Authentication required" }, 401);
      userId = data.user.id;
    }

    // Resolve event row OR construct one from {content_piece_id, channel_id}
    let eventRow: any | null = null;
    if (eventId) {
      const { data } = await admin
        .from("content_publish_events")
        .select("id, business_id, content_piece_id, channel_id, status, payload")
        .eq("id", eventId)
        .maybeSingle();
      eventRow = data;
      if (!eventRow) return json({ error: "Publish event not found" }, 404);
    } else {
      if (!piecePayload || !channelPayload) return json({ error: "Missing content_piece_id or channel_id" }, 400);
      const { data: piece } = await admin
        .from("content_pieces")
        .select("id, business_id")
        .eq("id", piecePayload)
        .maybeSingle();
      if (!piece) return json({ error: "Content piece not found" }, 404);
      const { data: inserted, error: insErr } = await admin
        .from("content_publish_events")
        .insert({
          business_id: piece.business_id,
          content_piece_id: piece.id,
          channel_id: channelPayload,
          status: "publishing",
          payload: { options },
        })
        .select()
        .single();
      if (insErr) return json({ error: insErr.message }, 500);
      eventRow = inserted;
    }

    // Membership check for non-service-role callers
    if (!isServiceRole) {
      const { data: membership } = await admin
        .from("business_users")
        .select("role")
        .eq("business_id", eventRow.business_id)
        .eq("user_id", userId!)
        .maybeSingle();
      const { data: profile } = await admin.from("users").select("is_admin").eq("id", userId!).maybeSingle();
      if (!profile?.is_admin && !membership) return json({ error: "Not allowed" }, 403);
    }

    // Mark publishing
    await admin
      .from("content_publish_events")
      .update({ status: "publishing", updated_at: new Date().toISOString() })
      .eq("id", eventRow.id);

    const { data: piece, error: pieceErr } = await admin
      .from("content_pieces")
      .select("id, content, output_type, business_id")
      .eq("id", eventRow.content_piece_id)
      .single();
    if (pieceErr || !piece) throw new Error(pieceErr?.message ?? "Content piece missing");

    const { data: channel, error: chErr } = await admin
      .from("publishing_channels")
      .select("id, provider, config, credentials_encrypted, status")
      .eq("id", eventRow.channel_id)
      .single();
    if (chErr || !channel) throw new Error(chErr?.message ?? "Channel missing");
    if (channel.status !== "active") throw new Error("Channel is not active");

    let creds: Record<string, string | undefined> = {};
    if (piiEncryptionEnabled && channel.credentials_encrypted) {
      creds = (await decryptJson<Record<string, string | undefined>>(channel.credentials_encrypted as any)) ?? {};
    }

    try {
      const result = await publishToProvider(
        channel.provider as string,
        creds,
        (channel.config ?? {}) as Record<string, unknown>,
        piece.content,
        { ...((eventRow.payload as any)?.options ?? {}), ...options },
      );
      await admin
        .from("content_publish_events")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          external_post_url: result.external_post_url ?? null,
          error_message: null,
        })
        .eq("id", eventRow.id);

      // Increment piece counter (best-effort)
      await admin.rpc("increment_published_count" as any, { _piece_id: piece.id }).catch(async () => {
        const { data: cur } = await admin.from("content_pieces").select("published_count").eq("id", piece.id).single();
        await admin.from("content_pieces").update({ published_count: ((cur?.published_count ?? 0) + 1) }).eq("id", piece.id);
      });

      await admin
        .from("publishing_channels")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", channel.id);

      return json({ ok: true, event_id: eventRow.id, external_post_url: result.external_post_url ?? null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin
        .from("content_publish_events")
        .update({ status: "failed", error_message: msg })
        .eq("id", eventRow.id);
      return json({ ok: false, event_id: eventRow.id, error: msg }, 200);
    }
  } catch (e) {
    captureEdgeError(e, req, { function_name: "publish-content-piece" });
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
