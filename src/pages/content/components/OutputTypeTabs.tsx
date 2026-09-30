// Sprint 3: 8 output type definitions used by Content Generator

export type OutputType =
  | "twitter_post"
  | "linkedin_post"
  | "email_block"
  | "ad_copy_headline"
  | "ad_copy_body"
  | "website_quote"
  | "short_caption"
  | "meta_description";

export interface OutputTypeSpec {
  id: OutputType;
  label: string;
  short: string;
  /** Soft warning threshold. linkedin uses word-count instead — undefined here. */
  warnAt?: number;
  /** Hard limit shown to user; undefined = no hard cap (linkedin). */
  hardLimit?: number;
  /** linkedin uses words instead of chars. */
  countMode: "chars" | "words";
}

export const OUTPUT_TYPES: OutputTypeSpec[] = [
  { id: "twitter_post",     label: "Twitter / X",      short: "X",       countMode: "chars", warnAt: 260, hardLimit: 280 },
  { id: "linkedin_post",    label: "LinkedIn",         short: "in",      countMode: "words" },
  { id: "email_block",      label: "Email",            short: "Mail",    countMode: "chars", warnAt: 600, hardLimit: 700 },
  { id: "ad_copy_headline", label: "Ad headline",      short: "Ad H",    countMode: "chars", warnAt: 25,  hardLimit: 30 },
  { id: "ad_copy_body",     label: "Ad body",          short: "Ad B",    countMode: "chars", warnAt: 80,  hardLimit: 90 },
  { id: "website_quote",    label: "Website quote",    short: "Quote",   countMode: "chars", warnAt: 180, hardLimit: 200 },
  { id: "short_caption",    label: "Short caption",    short: "IG",      countMode: "chars", warnAt: 130, hardLimit: 150 },
  { id: "meta_description", label: "Meta description", short: "SEO",     countMode: "chars", warnAt: 140, hardLimit: 155 },
];

/** First 3 are free-tier accessible. */
export const FREE_TIER_TYPES: OutputType[] = ["twitter_post", "website_quote", "short_caption"];

export function getSpec(id: OutputType): OutputTypeSpec {
  return OUTPUT_TYPES.find((t) => t.id === id)!;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}