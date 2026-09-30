import { useState } from "react";
import { Play } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EXPLAINER_VIDEOS, ExplainerAudience, youtubeEmbedUrl, youtubeThumb } from "@/lib/explainer-videos";

interface YouTubeEmbedProps {
  audience: ExplainerAudience;
  /** "inline" replaces the thumbnail with the iframe on click; "modal" opens a dialog */
  mode?: "inline" | "modal";
  className?: string;
  /** Override the displayed title under the player */
  caption?: string;
  /** Show the runtime badge in the thumbnail corner */
  showDuration?: boolean;
  /** Rounded radius (matches surrounding card) */
  rounded?: "md" | "lg" | "xl" | "2xl";
}

export function YouTubeEmbed({
  audience,
  mode = "inline",
  className,
  caption,
  showDuration = true,
  rounded = "xl",
}: YouTubeEmbedProps) {
  const video = EXPLAINER_VIDEOS[audience];
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  const roundedClass = {
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
  }[rounded];

  const Thumb = (
    <button
      type="button"
      onClick={() => (mode === "modal" ? setOpen(true) : setPlaying(true))}
      className={cn(
        "group relative block w-full aspect-video overflow-hidden border bg-black",
        roundedClass,
      )}
      aria-label={`Play: ${video.title}`}
    >
      <img
        src={youtubeThumb(video.youtubeId, "max")}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = youtubeThumb(video.youtubeId, "hq");
        }}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-primary shadow-lg group-hover:scale-110 transition-transform">
          <Play className="h-7 w-7 ml-1" fill="currentColor" />
        </span>
      </span>
      {showDuration && (
        <span className="absolute bottom-3 right-3 rounded bg-black/80 px-2 py-0.5 text-xs font-mono text-white">
          {video.duration}
        </span>
      )}
      {caption !== "" && (
        <span className="absolute bottom-3 left-3 right-20 text-left text-sm font-medium text-white drop-shadow">
          {caption ?? video.title}
        </span>
      )}
    </button>
  );

  if (mode === "modal") {
    return (
      <>
        <div className={className}>{Thumb}</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-0">
            <DialogTitle className="sr-only">{video.title}</DialogTitle>
            <div className="aspect-video w-full">
              {open && (
                <iframe
                  src={youtubeEmbedUrl(video.youtubeId, { autoplay: true })}
                  title={video.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className={className}>
      {playing ? (
        <div className={cn("relative aspect-video w-full overflow-hidden bg-black", roundedClass)}>
          <iframe
            src={youtubeEmbedUrl(video.youtubeId, { autoplay: true })}
            title={video.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        Thumb
      )}
    </div>
  );
}

/** Tiny play-badge link — for tight spaces like banners and footers */
export function VideoBadgeLink({
  audience,
  label,
  className,
}: {
  audience: ExplainerAudience;
  label?: string;
  className?: string;
}) {
  const video = EXPLAINER_VIDEOS[audience];
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline",
          className,
        )}
      >
        <Play className="h-3.5 w-3.5" fill="currentColor" />
        {label ?? `Watch how it works (${video.duration})`}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-0">
          <DialogTitle className="sr-only">{video.title}</DialogTitle>
          <div className="aspect-video w-full">
            {open && (
              <iframe
                src={youtubeEmbedUrl(video.youtubeId, { autoplay: true })}
                title={video.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
