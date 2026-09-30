// Server-side mirror of src/lib/validation.ts. Deno-compatible zod.
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export { z };

const stripCtl = (s: string) =>
  // eslint-disable-next-line no-control-regex
  s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();

export const nameSchema = z.string().trim().min(1).max(120).transform(stripCtl);
export const fullNameSchema = z.string().trim().min(2).max(120).transform(stripCtl);
export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((v) => v.toLowerCase());
export const urlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => /^https?:\/\//i.test(v), "must be http(s) URL");
// Accept a valid URL, an empty string, undefined, or null. Older clients send
// `null` for omitted optional URL fields — we must not 400 on that.
export const optionalUrl = urlSchema
  .optional()
  .nullable()
  .or(z.literal("").transform(() => undefined));
export const tokenSchema = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const uuidSchema = z.string().uuid();
export const ratingSchema = z.coerce.number().int().min(1).max(5);
export const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i);
export const shortText = (max = 500) =>
  z.string().trim().max(max).transform((v) => stripCtl(v).slice(0, max));
export const longText = (min = 0, max = 5000) =>
  z.string().trim().min(min).max(max).transform((v) => stripCtl(v).slice(0, max));

/** Parse and return a 400 Response on failure. */
export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
  corsHeaders: Record<string, string>,
): { ok: true; data: z.infer<T> } | { ok: false; res: Response } {
  const r = schema.safeParse(body);
  if (r.success) return { ok: true, data: r.data };
  const fields: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const k = issue.path.join(".") || "_";
    if (!fields[k]) fields[k] = issue.message;
  }
  return {
    ok: false,
    res: new Response(JSON.stringify({ error: "invalid_payload", fields }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }),
  };
}

/* Common composite schemas reused by edge functions. */

export const submitTestimonialBody = z.object({
  token: tokenSchema,
  author_name: fullNameSchema,
  author_email: emailSchema,
  content: longText(10, 5000),
  rating: ratingSchema.optional().nullable(),
  media_url: optionalUrl,
  author_role: shortText(120).optional().nullable(),
  author_company: shortText(120).optional().nullable(),
  author_photo_url: optionalUrl,
  author_website_url: optionalUrl,
  media_size_bytes: z.coerce.number().int().min(0).max(500 * 1024 * 1024).optional().nullable(),
  media_duration_seconds: z.coerce.number().min(0).max(36000).optional().nullable(),
  outcome_claim: shortText(160).optional().nullable(),
  highlight_phrase: shortText(120).optional().nullable(),
});

export const widgetTrackBody = z.object({
  business_id: uuidSchema,
  widget_id: uuidSchema,
  proof_object_id: uuidSchema.optional().nullable(),
  event_type: z.enum(["impression", "interaction", "dismiss", "conversion", "conversion_assist"]),
  visitor_id: shortText(128).optional().nullable(),
  page_url: shortText(2048).optional().nullable(),
  variant: z.enum(["A", "B"]).optional().nullable(),
  meta: z.record(z.unknown()).optional().nullable(),
  session_id: shortText(128).optional().nullable(),
  device_type: shortText(32).optional().nullable(),
  visitor_type: shortText(32).optional().nullable(),
});

export const resolveTokenBody = z.object({ token: tokenSchema });

export const verifyDomainBody = z.object({
  business_id: uuidSchema,
  domain: domainSchema,
});

export const verifyInstallBody = z.object({
  business_id: uuidSchema,
  domain: domainSchema.optional(),
});
