// Wrapper around isomorphic-dompurify so we have a single import surface and
// can swap implementations later without touching call sites.
import DOMPurify from "isomorphic-dompurify";

const RICH_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s", "blockquote", "ul", "ol", "li",
    "a", "h1", "h2", "h3", "h4", "code", "pre", "span",
  ] as string[],
  ALLOWED_ATTR: ["href", "target", "rel", "class"] as string[],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ["target"] as string[],
};

/** Sanitize HTML allowed in proof content / template previews. */
export function sanitizeHtml(dirty: unknown): string {
  if (typeof dirty !== "string" || dirty.length === 0) return "";
  return DOMPurify.sanitize(dirty, RICH_CONFIG) as unknown as string;
}

/** Sanitize plain-text user content: strip control chars, collapse whitespace, cap length. */
export function sanitizeText(input: unknown, max = 5000): string {
  if (typeof input !== "string") return "";
  // Strip ASCII control chars except \n \r \t
  const cleaned = input
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
  return cleaned.slice(0, max);
}

/** Normalize an email: lowercase + trim. Does NOT validate. */
export function normalizeEmail(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

/** Make a filename safe for storage paths. */
export function safeFileName(input: unknown, fallback = "file"): string {
  if (typeof input !== "string" || !input) return fallback;
  return input.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || fallback;
}
