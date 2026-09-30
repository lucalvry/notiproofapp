// Explainer video catalog. Single source of truth — used by <YouTubeEmbed>,
// the /watch index, role switchers, empty states, and emails.

export type ExplainerAudience = "business" | "marketer" | "agency" | "customer";

export interface ExplainerVideo {
  id: ExplainerAudience;
  /** YouTube video ID (the bit after youtu.be/ or watch?v=) */
  youtubeId: string;
  title: string;
  /** One-line value prop shown under the title */
  tagline: string;
  /** Approx. runtime — display only */
  duration: string;
  /** Public landing-page route (under /watch) */
  watchPath: string;
}

export const EXPLAINER_VIDEOS: Record<ExplainerAudience, ExplainerVideo> = {
  business: {
    id: "business",
    youtubeId: "x-uzt72SaEY",
    title: "For business owners",
    tagline: "From signup to live social proof in 75 seconds.",
    duration: "1:15",
    watchPath: "/watch/business",
  },
  marketer: {
    id: "marketer",
    youtubeId: "Jw9CnKnXBkw",
    title: "For marketers",
    tagline: "Turn one happy customer into a week of content.",
    duration: "1:20",
    watchPath: "/watch/marketer",
  },
  agency: {
    id: "agency",
    youtubeId: "a_A6BnEDqrg",
    title: "For agencies",
    tagline: "One dashboard, every client, white-labelled.",
    duration: "1:30",
    watchPath: "/watch/agency",
  },
  customer: {
    id: "customer",
    youtubeId: "r2PR6uxCJ4A",
    title: "Sharing your experience — here's how it works",
    tagline: "60 seconds to leave a testimonial that actually helps.",
    duration: "1:00",
    watchPath: "/watch/customer",
  },
};

export const EXPLAINER_LIST: ExplainerVideo[] = [
  EXPLAINER_VIDEOS.business,
  EXPLAINER_VIDEOS.marketer,
  EXPLAINER_VIDEOS.agency,
  EXPLAINER_VIDEOS.customer,
];

export function youtubeThumb(youtubeId: string, quality: "hq" | "max" = "hq") {
  return `https://i.ytimg.com/vi/${youtubeId}/${quality === "max" ? "maxresdefault" : "hqdefault"}.jpg`;
}

export function youtubeEmbedUrl(youtubeId: string, opts: { autoplay?: boolean; mute?: boolean } = {}) {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (opts.autoplay) params.set("autoplay", "1");
  if (opts.mute) params.set("mute", "1");
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
}
