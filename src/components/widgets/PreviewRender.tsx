import { useEffect, useRef, useState } from "react";
import { Award, ChevronLeft, ChevronRight, MessageSquareQuote, Star, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ProofRow = Database["public"]["Tables"]["proof_objects"]["Row"];
// Some columns referenced here (poster_url, highlight_phrase, type, author_role,
// author_company, author_company_logo_url, author_photo_url) may not yet appear
// in the generated DB types. Treat them as optional.
type Proof = ProofRow & {
  poster_url?: string | null;
  highlight_phrase?: string | null;
  type?: string | null;
  author_role?: string | null;
  author_company?: string | null;
  author_company_logo_url?: string | null;
  author_photo_url?: string | null;
};

export interface WidgetConfig {
  variant?:
    | "floating"
    | "inline"
    | "badge"
    | "banner"
    | "wall"
    | "carousel"
    | "marquee"
    | "masonry"
    | "avatar_row"
    | "video_hero"
    | "logo_strip";
  position?: string;
  interval_seconds?: number;
  show_avatar?: boolean;
  show_rating?: boolean;
  brand_color?: string;
  powered_by?: boolean;
  default_cta_label?: string;
  default_cta_url?: string;
  business_website_url?: string;
  /** Real review count for the badge variant. Badge is hidden when missing or 0. */
  review_count?: number;
  // Carousel
  card_count?: number;        // 1-3 cards visible at once
  autoplay?: boolean;
  // Marquee
  direction?: "left" | "right";
  speed?: "slow" | "normal" | "fast";
  // Masonry / wall
  columns?: number;           // 2 / 3 / 4
  // Style preset (carousel + masonry)
  style_preset?: "soft" | "bold" | "minimal";
  // Logo strip
  logo_grayscale?: boolean;
}

function isVideoProof(p?: Proof | null) {
  if (!p) return false;
  if (p.type && /video/i.test(p.type)) return true;
  const u = (p.media_url || "").toLowerCase().split("?")[0];
  return /\.(webm|mp4|mov|m4v)$/.test(u);
}

/** Build the attribution line: Name · Role, Company (graceful fallbacks). */
function buildAttribution(p: Proof): string {
  const name = (p.author_name ?? "").trim();
  const role = (p.author_role ?? "").trim();
  const company = (p.author_company ?? "").trim();
  if (!name) return "";
  if (role && company) return `${name} · ${role}, ${company}`;
  if (role) return `${name} · ${role}`;
  if (company) return `${name} · ${company}`;
  return name;
}

/** Bold the first case-insensitive occurrence of `highlight` inside `text`. */
function renderQuote(text: string, highlight?: string | null) {
  if (!highlight || !highlight.trim()) return text;
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent font-semibold text-slate-900">
        {text.slice(idx, idx + highlight.length)}
      </mark>
      {text.slice(idx + highlight.length)}
    </>
  );
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="inline-flex gap-px" aria-label={`${r} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" fill={i <= r ? "#F5B400" : "#E5E7EB"}>
          <path d="M10 1.5l2.7 5.47 6.04.88-4.37 4.26 1.03 6.01L10 15.27l-5.4 2.85 1.03-6.01L1.26 7.85l6.04-.88L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function VideoThumb({ src, brand }: { src: string; brand: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [poster, setPoster] = useState<string | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let cancelled = false;
    let captured = false;
    // Seek positions to try in order — skip black intros / fade-ins.
    const seekTimes = [1.5, 3, 5];
    let attempt = 0;

    const isMostlyDark = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      try {
        let dark = 0;
        const samples = 100;
        for (let i = 0; i < samples; i++) {
          const x = Math.floor(Math.random() * w);
          const y = Math.floor(Math.random() * h);
          const px = ctx.getImageData(x, y, 1, 1).data;
          const lum = 0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2];
          if (lum < 30) dark++;
        }
        return dark / samples > 0.95;
      } catch {
        return false; // tainted — assume fine
      }
    };

    const capture = () => {
      if (cancelled || captured) return;
      try {
        const w = v.videoWidth, h = v.videoHeight;
        if (!w || !h) return;
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, w, h);
        if (isMostlyDark(ctx, w, h) && attempt < seekTimes.length - 1) {
          attempt++;
          try { v.currentTime = seekTimes[attempt]; } catch { /* ignore */ }
          return; // wait for next 'seeked' event
        }
        const url = canvas.toDataURL("image/jpeg", 0.82);
        if (!cancelled) {
          setPoster(url);
          captured = true;
        }
      } catch {
        /* tainted — keep video element */
      }
    };

    const onLoaded = () => {
      try { v.currentTime = seekTimes[0]; } catch { /* ignore */ }
      setTimeout(capture, 60);
    };
    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("seeked", capture);
    return () => {
      cancelled = true;
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("seeked", capture);
    };
  }, [src]);

  return (
    <div className="relative w-full h-full">
      {poster ? (
        <img src={poster} alt="" className="w-full h-full object-cover" />
      ) : (
        <video
          ref={videoRef}
          src={`${src}#t=1.5`}
          muted
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
        />
      )}
      <PlayOverlay brand={brand} />
    </div>
  );
}

function PlayOverlay({ brand }: { brand: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
      <div
        className="w-9 h-9 rounded-full bg-white/95 flex items-center justify-center shadow-md"
        style={{ boxShadow: `0 0 0 2px ${brand}55, 0 2px 8px rgba(0,0,0,.3)` }}
      >
        <svg width="14" height="14" viewBox="0 0 10 10" fill="#0f172a">
          <path d="M2 1l7 4-7 4z" />
        </svg>
      </div>
    </div>
  );
}

function NeutralMediaTile({ brand }: { brand: string }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `${brand}14` }}
    >
      <MessageSquareQuote className="h-7 w-7" style={{ color: brand, opacity: 0.55 }} />
    </div>
  );
}

function Media({ sample, cfg }: { sample: Proof | null; cfg: WidgetConfig }) {
  if (cfg.show_avatar === false) return null;
  const brand = cfg.brand_color ?? "#6366f1";
  const baseClass =
    "self-stretch aspect-square shrink-0 rounded-[10px] overflow-hidden bg-slate-100 flex items-center justify-center";
  const minStyle = { minHeight: 84, maxHeight: 140 } as const;

  if (!sample) {
    return (
      <div className={baseClass} style={minStyle}>
        <NeutralMediaTile brand={brand} />
      </div>
    );
  }

  // Pre-generated server poster wins (when available).
  if (isVideoProof(sample) && sample.poster_url) {
    return (
      <div className={baseClass} style={minStyle}>
        <div className="relative w-full h-full">
          <img src={sample.poster_url} alt="" className="w-full h-full object-cover" />
          <PlayOverlay brand={brand} />
        </div>
      </div>
    );
  }
  if (isVideoProof(sample) && sample.media_url) {
    return (
      <div className={baseClass} style={minStyle}>
        <VideoThumb src={sample.media_url} brand={brand} />
      </div>
    );
  }
  const photo = sample.author_photo_url || sample.author_avatar_url;
  if (photo) {
    return (
      <div className={baseClass} style={minStyle}>
        <img src={photo} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  const name = (sample.author_name ?? "").trim();
  if (name) {
    const initial = name.charAt(0).toUpperCase();
    return (
      <div className={baseClass} style={minStyle}>
        <div
          className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
          style={{ background: brand }}
        >
          {initial}
        </div>
      </div>
    );
  }
  return (
    <div className={baseClass} style={minStyle}>
      <NeutralMediaTile brand={brand} />
    </div>
  );
}

function EmptyStateCard({ showPoweredBy }: { showPoweredBy: boolean }) {
  return (
    <div className="bg-white text-slate-900 border border-dashed border-slate-300 rounded-[14px] shadow-sm p-4 flex gap-3 items-center w-[420px] max-w-[420px]">
      <div className="self-stretch aspect-square shrink-0 rounded-[10px] bg-slate-100 flex items-center justify-center" style={{ minHeight: 84, maxHeight: 140 }}>
        <MessageSquareQuote className="h-7 w-7 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0 text-[12.5px] leading-snug flex flex-col text-slate-500">
        <div className="font-medium text-slate-700">No approved proof yet</div>
        <div className="mt-1">This widget will appear here once you have approved proof.</div>
        {showPoweredBy && (
          <div className="mt-auto pt-1 text-right">
            <span className="text-[9px] text-slate-300">powered by NotiProof</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  sample,
  cfg,
  showPoweredBy,
}: {
  sample: Proof | null;
  cfg: WidgetConfig;
  showPoweredBy: boolean;
}) {
  if (!sample) return <EmptyStateCard showPoweredBy={showPoweredBy} />;

  const text = sample.content ?? "";
  const trimmed = text.length > 140 ? text.slice(0, 140) + "…" : text;
  const showStars = cfg.show_rating !== false && !!sample.rating;
  const attribution = buildAttribution(sample);

  return (
    <div className="bg-white text-slate-900 border border-slate-900/[.06] rounded-[14px] shadow-[0_12px_32px_rgba(15,23,42,0.18)] p-3.5 flex gap-3 items-stretch relative w-[420px] max-w-[420px]">
      <button
        aria-label="Close"
        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-900/[.06] hover:text-slate-600"
        onClick={(e) => e.stopPropagation()}
      >
        <X className="h-4 w-4" />
      </button>
      <Media sample={sample} cfg={cfg} />
      <div className="flex-1 min-w-0 leading-snug flex flex-col">
        {showStars && (
          <div className="mb-1">
            <Stars rating={sample.rating as unknown as number} size={14} />
          </div>
        )}
        <div className="text-[13.5px] text-slate-700 line-clamp-3">
          {renderQuote(trimmed, sample.highlight_phrase)}
        </div>
        {attribution && (
          <div className="text-[11px] text-slate-500 mt-1.5 truncate">{attribution}</div>
        )}
        {showPoweredBy && (
          <div className="mt-auto pt-1 text-right">
            <span className="text-[9px] text-slate-300">powered by NotiProof</span>
          </div>
        )}
      </div>
    </div>
  );
}

function BannerVariant({
  sample,
  cfg,
  showPoweredBy,
}: {
  sample: Proof | null;
  cfg: WidgetConfig;
  showPoweredBy: boolean;
}) {
  const brand = cfg.brand_color ?? "#6366f1";

  if (!sample) {
    return (
      <div className="absolute top-0 left-0 right-0 bg-white border-b border-dashed border-slate-300 flex items-center gap-3 px-4 py-2 text-[12.5px] text-slate-500">
        <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: brand }} />
        <span>No approved proof yet — this banner will appear once you have one.</span>
        {showPoweredBy && (
          <span className="ml-auto text-[9px] text-slate-300 hidden sm:inline shrink-0">powered by NotiProof</span>
        )}
      </div>
    );
  }

  const text = sample.content ?? "";
  const trimmed = text.length > 90 ? text.slice(0, 90) + "…" : text;
  const showStars = cfg.show_rating !== false && !!sample.rating;
  const attribution = buildAttribution(sample);

  return (
    <div className="absolute top-0 left-0 right-0 bg-white border-b border-slate-900/[.06] shadow-sm flex items-center gap-3 px-4 py-2 text-[13px] text-slate-900">
      <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: brand }} />
      {showStars && (
        <div className="shrink-0">
          <Stars rating={sample.rating as unknown as number} size={13} />
        </div>
      )}
      <div className="text-slate-700 truncate flex-1 min-w-0">
        {renderQuote(trimmed, sample.highlight_phrase)}
      </div>
      {attribution && (
        <div className="text-[11px] text-slate-500 truncate shrink-0 max-w-[40%]">{attribution}</div>
      )}
      {showPoweredBy && (
        <span className="text-[9px] text-slate-300 hidden sm:inline shrink-0">powered by NotiProof</span>
      )}
      <button aria-label="Close" className="text-slate-400 hover:text-slate-600 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function WallVariant({
  sample,
  cfg,
  showPoweredBy,
}: {
  sample: Proof | null;
  cfg: WidgetConfig;
  showPoweredBy: boolean;
}) {
  if (!sample) {
    return (
      <div className="absolute bottom-4 left-4 right-4 flex justify-end">
        <EmptyStateCard showPoweredBy={showPoweredBy} />
      </div>
    );
  }
  return (
    <div className="absolute bottom-4 right-4">
      <Card sample={sample} cfg={cfg} showPoweredBy={showPoweredBy} />
    </div>
  );
}

/* ---------------- New variants (Phase 1) ---------------- */

/** Compact testimonial card sized for grids/marquees/carousels (auto-width). */
function MiniCard({
  proof,
  cfg,
  showPoweredBy = false,
}: {
  proof: Proof;
  cfg: WidgetConfig;
  showPoweredBy?: boolean;
}) {
  const text = proof.content ?? "";
  const trimmed = text.length > 180 ? text.slice(0, 180) + "…" : text;
  const showStars = cfg.show_rating !== false && !!proof.rating;
  const attribution = buildAttribution(proof);
  const photo = proof.author_photo_url || proof.author_avatar_url;
  const brand = cfg.brand_color ?? "#6366f1";
  const initial = (proof.author_name ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className="bg-white text-slate-900 border border-slate-900/[.06] rounded-[14px] shadow-[0_8px_24px_rgba(15,23,42,0.10)] p-3.5 flex flex-col gap-2 break-inside-avoid">
      {showStars && <Stars rating={proof.rating as unknown as number} size={13} />}
      <div className="text-[13px] leading-snug text-slate-700">
        {renderQuote(trimmed, proof.highlight_phrase)}
      </div>
      {(attribution || photo) && (
        <div className="flex items-center gap-2 mt-1">
          {photo ? (
            <img src={photo} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
              style={{ background: brand }}
            >
              {initial}
            </div>
          )}
          {attribution && (
            <div className="text-[11px] text-slate-500 truncate min-w-0">{attribution}</div>
          )}
        </div>
      )}
      {showPoweredBy && (
        <div className="text-right">
          <span className="text-[9px] text-slate-300">powered by NotiProof</span>
        </div>
      )}
    </div>
  );
}

function CarouselVariant({
  proofs,
  cfg,
  showPoweredBy,
}: {
  proofs: Proof[];
  cfg: WidgetConfig;
  showPoweredBy: boolean;
}) {
  const visible = Math.max(1, Math.min(3, cfg.card_count ?? 1));
  const [idx, setIdx] = useState(0);

  if (!proofs.length) {
    return (
      <div className="w-full max-w-[720px]">
        <EmptyStateCard showPoweredBy={showPoweredBy} />
      </div>
    );
  }

  const slice = proofs
    .slice(idx, idx + visible)
    .concat(idx + visible > proofs.length ? proofs.slice(0, (idx + visible) % proofs.length) : []);
  const display = slice.slice(0, visible);
  const max = Math.max(1, proofs.length);

  return (
    <div className="w-full max-w-[720px] flex flex-col gap-3">
      <div className="flex gap-3 items-stretch">
        {display.map((p, i) => (
          <div key={`${p.id}-${i}`} className="flex-1 min-w-0">
            <MiniCard proof={p} cfg={cfg} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => setIdx((i) => (i - 1 + max) % max)}
          className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {proofs.map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: i === idx ? cfg.brand_color ?? "#6366f1" : "#cbd5e1" }}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next"
          onClick={() => setIdx((i) => (i + 1) % max)}
          className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {showPoweredBy && (
        <div className="text-right">
          <span className="text-[9px] text-slate-300">powered by NotiProof</span>
        </div>
      )}
    </div>
  );
}

function MarqueeVariant({
  proofs,
  cfg,
  showPoweredBy,
}: {
  proofs: Proof[];
  cfg: WidgetConfig;
  showPoweredBy: boolean;
}) {
  if (!proofs.length) return <EmptyStateCard showPoweredBy={showPoweredBy} />;

  // Preview: just a static row (no animation) so the editor stays calm; runtime animates.
  return (
    <div className="w-full max-w-[720px] overflow-hidden">
      <div className="flex gap-3 items-stretch">
        {proofs.slice(0, 4).map((p) => (
          <div key={p.id} className="w-[260px] shrink-0">
            <MiniCard proof={p} cfg={cfg} />
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-400 text-center mt-2">
        Live: scrolls {cfg.direction === "right" ? "→" : "←"} ({cfg.speed ?? "normal"} speed)
      </div>
      {showPoweredBy && (
        <div className="text-right">
          <span className="text-[9px] text-slate-300">powered by NotiProof</span>
        </div>
      )}
    </div>
  );
}

function MasonryVariant({
  proofs,
  cfg,
  showPoweredBy,
}: {
  proofs: Proof[];
  cfg: WidgetConfig;
  showPoweredBy: boolean;
}) {
  if (!proofs.length) return <EmptyStateCard showPoweredBy={showPoweredBy} />;
  const cols = Math.max(2, Math.min(4, cfg.columns ?? 3));
  const colClass = cols === 2 ? "columns-2" : cols === 4 ? "columns-2 md:columns-4" : "columns-2 md:columns-3";
  return (
    <div className="w-full max-w-[720px]">
      <div className={`${colClass} gap-3 [column-fill:_balance]`}>
        {proofs.slice(0, 9).map((p) => (
          <div key={p.id} className="mb-3">
            <MiniCard proof={p} cfg={cfg} />
          </div>
        ))}
      </div>
      {showPoweredBy && (
        <div className="text-right mt-2">
          <span className="text-[9px] text-slate-300">powered by NotiProof</span>
        </div>
      )}
    </div>
  );
}

function AvatarRowVariant({
  proofs,
  cfg,
  showPoweredBy,
}: {
  proofs: Proof[];
  cfg: WidgetConfig;
  showPoweredBy: boolean;
}) {
  const brand = cfg.brand_color ?? "#6366f1";
  if (!proofs.length) {
    return (
      <div className="inline-flex items-center gap-3 bg-white border border-dashed border-slate-300 rounded-full px-4 py-2 text-[12px] text-slate-500">
        Avatar row appears once you have approved proof.
      </div>
    );
  }
  const avatars = proofs.slice(0, 5);
  const total = cfg.review_count ?? proofs.length;
  const ratings = proofs.filter((p) => !!p.rating).map((p) => Number(p.rating));
  const avg =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;

  return (
    <div className="inline-flex items-center gap-3 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm">
      <div className="flex -space-x-2">
        {avatars.map((p, i) => {
          const photo = p.author_photo_url || p.author_avatar_url;
          const initial = (p.author_name ?? "?").trim().charAt(0).toUpperCase();
          return photo ? (
            <img
              key={p.id}
              src={photo}
              alt=""
              className="w-7 h-7 rounded-full ring-2 ring-white object-cover"
              style={{ zIndex: 10 - i }}
            />
          ) : (
            <div
              key={p.id}
              className="w-7 h-7 rounded-full ring-2 ring-white flex items-center justify-center text-white text-[11px] font-bold"
              style={{ background: brand, zIndex: 10 - i }}
            >
              {initial}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col">
        {avg > 0 && (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-[#F5B400] text-[#F5B400]" />
            <span className="text-[12px] font-semibold text-slate-900">{avg.toFixed(1)}</span>
            <span className="text-[11px] text-slate-500">/ 5</span>
          </div>
        )}
        <div className="text-[11px] text-slate-600">
          Loved by <span className="font-semibold text-slate-900">{total.toLocaleString()}</span>{" "}
          customer{total === 1 ? "" : "s"}
        </div>
      </div>
      {showPoweredBy && (
        <span className="text-[9px] text-slate-300 ml-1">powered by NotiProof</span>
      )}
    </div>
  );
}

/* ---------------- Phase 2 variants ---------------- */

/** One large featured video testimonial with name, role, and quote. */
function VideoHeroVariant({
  proofs,
  cfg,
  showPoweredBy,
}: {
  proofs: Proof[];
  cfg: WidgetConfig;
  showPoweredBy: boolean;
}) {
  const brand = cfg.brand_color ?? "#6366f1";
  // Prefer the first video proof; fall back to first proof.
  const featured = proofs.find((p) => isVideoProof(p)) ?? proofs[0] ?? null;

  if (!featured) {
    return (
      <div className="w-full max-w-[640px] aspect-video rounded-[14px] border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[12.5px] text-slate-500">
        Video hero appears once you have an approved video testimonial.
      </div>
    );
  }

  const text = featured.content ?? "";
  const trimmed = text.length > 220 ? text.slice(0, 220) + "…" : text;
  const attribution = buildAttribution(featured);
  const showStars = cfg.show_rating !== false && !!featured.rating;

  return (
    <div className="w-full max-w-[640px] flex flex-col gap-3">
      <div className="relative w-full aspect-video rounded-[14px] overflow-hidden bg-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.18)]">
        {isVideoProof(featured) && featured.poster_url ? (
          <>
            <img src={featured.poster_url} alt="" className="w-full h-full object-cover" />
            <PlayOverlay brand={brand} />
          </>
        ) : isVideoProof(featured) && featured.media_url ? (
          <VideoThumb src={featured.media_url} brand={brand} />
        ) : featured.author_photo_url || featured.author_avatar_url ? (
          <>
            <img
              src={(featured.author_photo_url || featured.author_avatar_url) as string}
              alt=""
              className="w-full h-full object-cover"
            />
            <PlayOverlay brand={brand} />
          </>
        ) : (
          <NeutralMediaTile brand={brand} />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {showStars && <Stars rating={featured.rating as unknown as number} size={15} />}
        <div className="text-[15px] leading-snug text-slate-800">
          {renderQuote(trimmed, featured.highlight_phrase)}
        </div>
        {attribution && (
          <div className="text-[12px] text-slate-500 mt-0.5">{attribution}</div>
        )}
        {showPoweredBy && (
          <div className="text-right">
            <span className="text-[9px] text-slate-300">powered by NotiProof</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Horizontal strip of company names/logos derived from author_company. */
function LogoStripVariant({
  proofs,
  cfg,
  showPoweredBy,
}: {
  proofs: Proof[];
  cfg: WidgetConfig;
  showPoweredBy: boolean;
}) {
  // Dedupe by company name; prefer entries that have a logo url.
  const map = new Map<string, { name: string; logo: string | null }>();
  for (const p of proofs) {
    const name = (p.author_company ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = map.get(key);
    const logo = p.author_company_logo_url ?? null;
    if (!existing) map.set(key, { name, logo });
    else if (!existing.logo && logo) map.set(key, { name, logo });
  }
  const entries = Array.from(map.values()).slice(0, 8);
  const grayscale = cfg.logo_grayscale !== false;

  if (!entries.length) {
    return (
      <div className="w-full max-w-[720px] py-6 px-4 rounded-[14px] border border-dashed border-slate-300 bg-slate-50 text-center text-[12.5px] text-slate-500">
        Logo strip appears once your approved testimonials include a company name.
      </div>
    );
  }

  return (
    <div className="w-full max-w-[720px] flex flex-col gap-2">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 text-center">
        Trusted by teams at
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 py-2">
        {entries.map((e) =>
          e.logo ? (
            <img
              key={e.name}
              src={e.logo}
              alt={e.name}
              className={`h-8 w-auto object-contain ${grayscale ? "grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition" : ""}`}
            />
          ) : (
            <span
              key={e.name}
              className={`text-[15px] font-semibold tracking-tight ${grayscale ? "text-slate-500" : "text-slate-700"}`}
            >
              {e.name}
            </span>
          ),
        )}
      </div>
      {showPoweredBy && (
        <div className="text-right">
          <span className="text-[9px] text-slate-300">powered by NotiProof</span>
        </div>
      )}
    </div>
  );
}

export function PreviewRender({
  variant,
  cfg,
  sample,
  samples,
  showPoweredBy = true,
}: {
  variant:
    | "floating"
    | "inline"
    | "badge"
    | "banner"
    | "wall"
    | "carousel"
    | "marquee"
    | "masonry"
    | "avatar_row"
    | "video_hero"
    | "logo_strip";
  cfg: WidgetConfig;
  sample?: Proof | null;
  samples?: Proof[];
  showPoweredBy?: boolean;
}) {
  const proof = sample ?? null;
  const list = samples && samples.length ? samples : proof ? [proof] : [];

  if (variant === "badge") {
    const count = cfg.review_count ?? 0;
    if (!count || count <= 0) {
      return (
        <div className="inline-flex items-center gap-2 bg-card border border-dashed rounded-full px-3 py-1.5 text-xs text-muted-foreground">
          <Award className="h-4 w-4" />
          <span>Badge will appear once you have approved reviews.</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 bg-card border rounded-full px-3 py-1.5 shadow-sm">
        <Award className="h-4 w-4" style={{ color: cfg.brand_color ?? "hsl(var(--gold))" }} />
        <span className="text-xs font-semibold">
          {count} verified review{count === 1 ? "" : "s"}
        </span>
      </div>
    );
  }

  if (variant === "carousel") {
    return <CarouselVariant proofs={list} cfg={cfg} showPoweredBy={showPoweredBy} />;
  }

  if (variant === "marquee") {
    return <MarqueeVariant proofs={list} cfg={cfg} showPoweredBy={showPoweredBy} />;
  }

  if (variant === "masonry") {
    return <MasonryVariant proofs={list} cfg={cfg} showPoweredBy={showPoweredBy} />;
  }

  if (variant === "avatar_row") {
    return <AvatarRowVariant proofs={list} cfg={cfg} showPoweredBy={showPoweredBy} />;
  }

  if (variant === "video_hero") {
    return <VideoHeroVariant proofs={list} cfg={cfg} showPoweredBy={showPoweredBy} />;
  }

  if (variant === "logo_strip") {
    return <LogoStripVariant proofs={list} cfg={cfg} showPoweredBy={showPoweredBy} />;
  }

  if (variant === "banner") {
    return <BannerVariant sample={proof} cfg={cfg} showPoweredBy={showPoweredBy} />;
  }

  if (variant === "wall") {
    return <WallVariant sample={proof} cfg={cfg} showPoweredBy={showPoweredBy} />;
  }

  if (variant === "inline") {
    return <Card sample={proof} cfg={cfg} showPoweredBy={showPoweredBy} />;
  }

  const posClass =
    cfg.position === "bottom-right"
      ? "bottom-4 right-4"
      : cfg.position === "top-left"
      ? "top-4 left-4"
      : cfg.position === "top-right"
      ? "top-4 right-4"
      : "bottom-4 left-4";

  return (
    <div className={`absolute ${posClass}`}>
      <Card sample={proof} cfg={cfg} showPoweredBy={showPoweredBy} />
    </div>
  );
}
