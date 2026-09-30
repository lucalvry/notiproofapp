// Single source of truth for client-side input validation. Built on zod 4.
// Server-side mirrors live in supabase/functions/_shared/validation.ts.
import { z } from "zod";
import { sanitizeText, normalizeEmail } from "./sanitize";

/* ─────────── primitives ─────────── */

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(120, "Too long")
  .transform((v) => sanitizeText(v, 120));

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name")
  .max(120, "Too long")
  .regex(/^[\p{L}\p{M} '.\-]+$/u, "Letters, spaces, apostrophes and hyphens only")
  .transform((v) => sanitizeText(v, 120));

export const emailSchema = z
  .string()
  .trim()
  .min(3, "Enter an email")
  .max(254, "Email too long")
  .email("Enter a valid email")
  .transform(normalizeEmail);

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "Password too long")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "Mix letters and numbers");

export const urlSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(2048, "URL too long")
  .refine((v) => /^https?:\/\//i.test(v), "Must start with http(s)://")
  .refine((v) => {
    try {
      const u = new URL(v);
      // Block obvious local/private addresses client-side (best-effort).
      return !/^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|::1)/i.test(u.hostname);
    } catch {
      return false;
    }
  }, "URL host not allowed");

export const optionalUrl = urlSchema.optional().or(z.literal("").transform(() => undefined));

export const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter a domain")
  .max(253, "Domain too long")
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,
    "Enter a valid domain (e.g. example.com)",
  );

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Lowercase letters, numbers, and hyphens only");

export const uuidSchema = z.string().uuid("Invalid id");

export const tokenSchema = z
  .string()
  .trim()
  .min(8, "Invalid link")
  .max(128, "Invalid link")
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid link");

export const ratingSchema = z.coerce.number().int().min(1).max(5);

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex color like #1a73e8");

export const phoneSchema = z
  .string()
  .trim()
  .min(5, "Enter a phone number")
  .max(32, "Too long")
  .regex(/^[+0-9 ()\-.]+$/, "Digits, spaces and + - ( ) only");

export const shortText = (max = 500) =>
  z.string().trim().max(max, `Max ${max} characters`).transform((v) => sanitizeText(v, max));

export const longText = (min = 0, max = 5000) => {
  let s = z.string().trim();
  if (min > 0) s = s.min(min, `Min ${min} characters`);
  return s.max(max, `Max ${max} characters`).transform((v) => sanitizeText(v, max));
};

export const richText = (max = 10000) =>
  z.string().trim().max(max, `Max ${max} characters`).transform((v) => sanitizeText(v, max));

/* ─────────── helpers ─────────── */

/** Run safeParse and return either parsed data or a single human error. */
export function parseOrError<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): { data: z.infer<T>; error: null } | { data: null; error: string } {
  const r = schema.safeParse(data);
  if (r.success) return { data: r.data, error: null };
  const first = r.error.issues[0];
  return { data: null, error: first?.message ?? "Invalid input" };
}

/** Field-level error map suitable for forms. */
export function fieldErrors<T extends z.ZodTypeAny>(schema: T, data: unknown) {
  const r = schema.safeParse(data);
  if (r.success) return { ok: true as const, data: r.data, errors: {} as Record<string, string> };
  const errors: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false as const, data: null, errors };
}

/* ─────────── composite schemas (forms) ─────────── */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

export const registerSchema = z
  .object({
    fullName: fullNameSchema,
    businessName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    accountType: z.enum(["individual", "organization"]).optional(),
    agreedToTerms: z.literal(true, { message: "You must accept the terms" }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const profileSchema = z.object({
  full_name: fullNameSchema,
  avatar_url: optionalUrl,
});

export const businessSettingsSchema = z.object({
  name: nameSchema,
  website_url: optionalUrl,
  industry: shortText(80).optional(),
  brand_color: hexColorSchema.optional().or(z.literal("").transform(() => undefined)),
  time_zone: shortText(64).optional(),
});

export const teamInviteSchema = z.object({
  email: emailSchema,
  role: z.enum(["owner", "editor", "viewer"]),
});

export const proofRequestSchema = z.object({
  recipient_name: nameSchema.optional().or(z.literal("").transform(() => undefined)),
  recipient_email: emailSchema,
  custom_message: shortText(1000).optional(),
  requested_type: z.enum(["testimonial", "video_testimonial", "review"]).default("testimonial"),
});

export const proofEditSchema = z.object({
  author_name: nameSchema.optional().or(z.literal("").transform(() => undefined)),
  author_role: shortText(120).optional(),
  author_company: shortText(120).optional(),
  author_website_url: optionalUrl,
  author_photo_url: optionalUrl,
  content: longText(0, 5000).optional(),
  highlight_phrase: shortText(280).optional(),
  cta_label: shortText(60).optional(),
  cta_url: optionalUrl,
  transcript: longText(0, 20000).optional(),
});

export const widgetEditorSchema = z.object({
  name: nameSchema,
  target_url: optionalUrl,
  frequency_cap_per_user: z.coerce.number().int().min(0).max(1000).optional().nullable(),
  load_delay_ms: z.coerce.number().int().min(0).max(60000).default(0),
});

export const collectTestimonialSchema = z.object({
  token: tokenSchema,
  author_name: fullNameSchema,
  author_email: emailSchema,
  content: longText(10, 5000),
  rating: ratingSchema.optional(),
  author_role: shortText(120).optional(),
  author_company: shortText(120).optional(),
  author_website_url: optionalUrl,
  outcome_claim: shortText(160).optional(),
  highlight_phrase: shortText(120).optional(),
});

export const domainAddSchema = z.object({ domain: domainSchema });

export const integrationCredentialsSchema = z.object({
  // Each value is just an opaque secret with a length cap. Never logged.
  values: z.record(z.string(), z.string().min(1).max(2048)),
});
