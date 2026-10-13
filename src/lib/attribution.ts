// Sign-up attribution options: why people join and where they heard about us.
export const SIGNUP_REASONS = [
  { value: "show_reviews", label: "Show reviews on my website" },
  { value: "collect_testimonials", label: "Collect testimonials" },
  { value: "conversions", label: "Get more sales and conversions" },
  { value: "content_ads", label: "Social proof for ads and content" },
  { value: "agency", label: "I'm an agency managing clients" },
  { value: "other", label: "Something else" },
] as const;

export interface SourceOption {
  value: string;
  label: string;
  /** When set, a follow-up text field is required. */
  followUp?: string;
}

export const SIGNUP_SOURCES: SourceOption[] = [
  { value: "chatgpt", label: "ChatGPT" },
  { value: "gemini", label: "Gemini" },
  { value: "claude", label: "Claude" },
  { value: "perplexity", label: "Perplexity" },
  { value: "google", label: "Google search" },
  { value: "bing_yahoo", label: "Bing / Yahoo" },
  { value: "youtube", label: "YouTube", followUp: "Which channel?" },
  { value: "tiktok", label: "TikTok", followUp: "Which account?" },
  { value: "instagram", label: "Instagram", followUp: "Which account?" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X (Twitter)" },
  { value: "referral", label: "A friend or colleague", followUp: "Their name or email" },
  { value: "blog", label: "A blog or article", followUp: "Which one?" },
  { value: "podcast", label: "A podcast", followUp: "Which one?" },
  { value: "other", label: "Other", followUp: "Tell us where" },
];

export interface AttributionAnswers {
  reason: string;
  reasonOther: string;
  source: string;
  sourceDetail: string;
}

export const emptyAttribution: AttributionAnswers = { reason: "", reasonOther: "", source: "", sourceDetail: "" };

/** Returns an error message, or null when the answers are complete. */
export function attributionError(a: AttributionAnswers): string | null {
  if (!a.reason) return "Tell us what brings you to NotiProof.";
  if (a.reason === "other" && !a.reasonOther.trim()) return "Tell us what brings you to NotiProof.";
  if (!a.source) return "Tell us where you heard about us.";
  const opt = SIGNUP_SOURCES.find((s) => s.value === a.source);
  if (opt?.followUp && !a.sourceDetail.trim()) return `${opt.label}: ${opt.followUp.toLowerCase()}`;
  return null;
}

const PENDING_KEY = "notiproof.pending_attribution";
export function savePendingAttribution(a: AttributionAnswers) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(a));
}
export function getPendingAttribution(): AttributionAnswers | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as AttributionAnswers) : null;
  } catch {
    return null;
  }
}
export function clearPendingAttribution() {
  localStorage.removeItem(PENDING_KEY);
}
