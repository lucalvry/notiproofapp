import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, Video, Type, Loader2, CheckCircle2, AlertTriangle, RefreshCw, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { uploadToBunny, generateVideoPoster } from "@/lib/bunny-upload";
import { collectTestimonialSchema, parseOrError } from "@/lib/validation";
import { showRateLimitToastIf } from "@/lib/use-rate-limit-toast";
import { normalizePhoto } from "@/lib/image-normalize";
import { VideoBadgeLink } from "@/components/video/YouTubeEmbed";

// Pre-normalization size cap (raw user file). After client-side normalization
// the JPEG output is always ≤ 5 MB.
const MAX_PHOTO_INPUT_BYTES = 25 * 1024 * 1024; // 25 MB raw input
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
// We accept everything the browser claims is an image, plus HEIC/HEIF which
// some browsers report with an empty MIME type. The normalizer is the source
// of truth for whether the file is actually decodable.
const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "image/heic", "image/heif",
  "", // empty MIME (Safari/HEIC) — let the normalizer try
]);

interface CollectionContext {
  business_name: string;
  business_logo_url: string | null;
  brand_color: string | null;
  recipient_name: string | null;
  expired: boolean;
  already_completed: boolean;
  max_video_seconds: number;
}

export default function Collect() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"text" | "video">("text");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  // Optional "About you" details
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [outcomeClaim, setOutcomeClaim] = useState("");
  const [highlightPhrase, setHighlightPhrase] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  // Tracks photo upload errors so we can show an inline retry/skip card
  // instead of a dismissive `window.confirm`.
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [skipPhoto, setSkipPhoto] = useState(false);
  const [showAboutYou, setShowAboutYou] = useState(false);
  const [ctx, setCtx] = useState<CollectionContext | null>(null);
  const [ctxError, setCtxError] = useState<string | null>(null);

  // video
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [recordSecondsLeft, setRecordSecondsLeft] = useState<number>(0);
  const recordStartRef = useRef<number>(0);
  const countdownRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("resolve-testimonial-token", {
        body: { token },
      });
      if (error || !data?.ok) {
        setCtxError("This testimonial link is invalid.");
        return;
      }
      if (data.expired) { setCtxError("This testimonial link has expired."); return; }
      if (data.already_completed) { setCtxError("This testimonial has already been submitted. Thank you!"); return; }
      setCtx({
        business_name: data.business_name,
        business_logo_url: data.business_logo_url,
        brand_color: data.brand_color,
        recipient_name: data.recipient_name,
        expired: data.expired,
        already_completed: data.already_completed,
        max_video_seconds: typeof data.max_video_seconds === "number" ? data.max_video_seconds : 30,
      });
      if (data.recipient_name) setName(data.recipient_name);
    })();
  }, [token]);

  // Pick the best supported MIME type. iOS Safari only supports mp4/h264 — try it
  // first so iPhone visitors don't fall through to an unsupported webm path.
  // Android Chrome and desktop browsers will skip past mp4 candidates and land on webm.
  const pickRecorderMime = (): { mime: string; ext: string; contentType: string } => {
    if (typeof MediaRecorder === "undefined") return { mime: "", ext: "webm", contentType: "video/webm" };
    const candidates: Array<{ mime: string; ext: string; contentType: string }> = [
      { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4", contentType: "video/mp4" },
      { mime: "video/mp4;codecs=h264,aac", ext: "mp4", contentType: "video/mp4" },
      { mime: "video/mp4", ext: "mp4", contentType: "video/mp4" },
      { mime: "video/webm;codecs=vp9,opus", ext: "webm", contentType: "video/webm" },
      { mime: "video/webm;codecs=vp8,opus", ext: "webm", contentType: "video/webm" },
      { mime: "video/webm", ext: "webm", contentType: "video/webm" },
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c.mime)) return c;
    }
    return { mime: "", ext: "webm", contentType: "video/webm" };
  };

  const recorderMimeRef = useRef<{ mime: string; ext: string; contentType: string }>({
    mime: "",
    ext: "webm",
    contentType: "video/webm",
  });

  const startRecording = async () => {
    const maxSec = ctx?.max_video_seconds ?? 30;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // iOS Safari requires playsInline + muted to preview a live MediaStream
        videoRef.current.muted = true;
        (videoRef.current as any).playsInline = true;
        videoRef.current.play().catch(() => undefined);
      }
      const picked = pickRecorderMime();
      recorderMimeRef.current = picked;
      const recorder = picked.mime ? new MediaRecorder(stream, { mimeType: picked.mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorderMimeRef.current.contentType });
        setVideoBlob(blob);
        const elapsed = (Date.now() - recordStartRef.current) / 1000;
        setVideoDuration(Math.min(elapsed, maxSec));
        stream.getTracks().forEach((t) => t.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = URL.createObjectURL(blob);
          videoRef.current.muted = false;
        }
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
        if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
      };
      // Request small timeslices so we get periodic chunks (better for long recordings
      // and helps iOS Safari which sometimes drops a single huge chunk on stop).
      recorder.start(1000);
      recorderRef.current = recorder;
      recordStartRef.current = Date.now();
      setRecording(true);
      setRecordSecondsLeft(maxSec);
      // Hard cap: auto-stop at the plan's max video duration.
      stopTimerRef.current = window.setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === "recording") recorderRef.current.stop();
        setRecording(false);
      }, maxSec * 1000);
      countdownRef.current = window.setInterval(() => {
        const left = Math.max(0, maxSec - Math.floor((Date.now() - recordStartRef.current) / 1000));
        setRecordSecondsLeft(left);
      }, 250);
    } catch (e) {
      toast({ title: "Camera unavailable", description: (e as Error).message, variant: "destructive" });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Validate the form payload up-front so the UI shows a single clear error
    // before we touch the network or the camera output.
    const validation = parseOrError(collectTestimonialSchema, {
      token,
      author_name: name,
      author_email: email,
      content: mode === "video" && !content.trim() ? `Video testimonial from ${name}` : content,
      rating,
      author_role: role || undefined,
      author_company: company || undefined,
      author_website_url: website
        ? (/^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`)
        : undefined,
      outcome_claim: outcomeClaim || undefined,
      highlight_phrase: highlightPhrase || undefined,
    });
    if (validation.error && mode === "text") {
      return toast({ title: "Check your details", description: validation.error, variant: "destructive" });
    }
    if (mode === "video" && !videoBlob) {
      return toast({ title: "No video recorded", description: "Record a short video before submitting.", variant: "destructive" });
    }
    if (videoBlob && videoBlob.size > MAX_VIDEO_BYTES) {
      return toast({ title: "Video too large", description: "Please keep videos under 50 MB.", variant: "destructive" });
    }
    if (mode === "text" && !photoFile) {
      // Auto-open the About-you section so the file picker is visible.
      setShowAboutYou(true);
      return toast({ title: "Photo required", description: "Please add your photo in the “About you” section. It appears with your testimonial.", variant: "destructive" });
    }
    if (photoFile) {
      const sniffedType = (photoFile.type || "").toLowerCase();
      if (!ALLOWED_PHOTO_TYPES.has(sniffedType) && !sniffedType.startsWith("image/")) {
        return toast({ title: "Unsupported photo", description: "Please choose an image file (JPEG, PNG, WebP, GIF, or HEIC).", variant: "destructive" });
      }
      if (photoFile.size > MAX_PHOTO_INPUT_BYTES) {
        return toast({ title: "Photo too large", description: "Please choose a photo under 25 MB.", variant: "destructive" });
      }
    }

    setSubmitting(true);
    try {
      let mediaUrl: string | null = null;
      if (mode === "video" && videoBlob) {
        const { ext, contentType } = recorderMimeRef.current;
        mediaUrl = await uploadToBunny({
          kind: "media",
          folder: `testimonials/${token}`,
          filename: `${Date.now()}.${ext}`,
          contentType,
          blob: videoBlob,
          collectionToken: token,
        });
      }

      let photoUrl: string | null = null;
      // For text testimonials a photo is REQUIRED. For video, only attempt
      // upload if the user actually selected one. We never silently drop a
      // selected photo: any final failure blocks submission.
      const shouldUploadPhoto = !!photoFile && !(mode === "video" && skipPhoto);
      if (shouldUploadPhoto && photoFile) {
        // Step 1: normalize on the client (HEIC → JPEG, downscale, strip EXIF).
        // Step 2: upload with one automatic retry — transient Bunny 5xx /
        // network errors should never destroy a recorded testimonial.
        let normalized;
        try {
          normalized = await normalizePhoto(photoFile);
        } catch (normErr) {
          console.error("[collect] photo normalization failed", normErr);
          setSubmitting(false);
          setPhotoUploadError(
            (normErr as Error)?.message ?? "We couldn't process this image. Please try a different photo.",
          );
          return;
        }

        const uploadOnce = () =>
          uploadToBunny({
            kind: "media",
            folder: `testimonials/${token}`,
            filename: `photo-${Date.now()}-${normalized.file.name}`,
            contentType: "image/jpeg",
            blob: normalized.file,
            collectionToken: token,
          });

        try {
          photoUrl = await uploadOnce();
        } catch (firstErr) {
          console.warn("[collect] photo upload failed, retrying once", firstErr);
          await new Promise((r) => setTimeout(r, 800));
          try {
            photoUrl = await uploadOnce();
          } catch (secondErr) {
            console.error("[collect] photo upload failed after retry", secondErr);
            setSubmitting(false);
            setPhotoUploadError(
              (secondErr as Error)?.message
                ?? "Your photo couldn't be uploaded. Please check your connection and try again.",
            );
            return;
          }
        }
      }

      // Reaching here = photo upload succeeded (or was skipped). Clear any
      // prior error state so the inline alert disappears.
      setPhotoUploadError(null);


      const finalContent = mode === "video"
        ? (content.trim() || `Video testimonial from ${name}`)
        : content.trim();

      const normalizedWebsite = website.trim()
        ? (/^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`)
        : null;

      // Build payload with only the fields that have values. The edge function
      // validates optional URL fields strictly — sending `null` was triggering
      // `invalid_payload` errors, so we omit empties entirely.
      const submitBody: Record<string, unknown> = {
        token,
        author_name: name,
        author_email: email,
        content: finalContent,
        rating,
      };
      if (mediaUrl) submitBody.media_url = mediaUrl;
      if (role.trim()) submitBody.author_role = role.trim();
      if (company.trim()) submitBody.author_company = company.trim();
      if (photoUrl) submitBody.author_photo_url = photoUrl;
      if (normalizedWebsite) submitBody.author_website_url = normalizedWebsite;
      if (outcomeClaim.trim()) submitBody.outcome_claim = outcomeClaim.trim();
      if (highlightPhrase.trim()) submitBody.highlight_phrase = highlightPhrase.trim();
      if (mode === "video" && videoBlob) submitBody.media_size_bytes = videoBlob.size;
      if (mode === "video" && videoDuration > 0) {
        submitBody.media_duration_seconds = Math.round(videoDuration * 10) / 10;
      }

      const { data, error } = await supabase.functions.invoke("submit-testimonial", {
        body: submitBody,
      });
      if (error) {
        if (showRateLimitToastIf(error)) return;
        throw new Error(error.message);
      }
      if (data && (data as { error?: string }).error && showRateLimitToastIf(data)) return;
      if (!data?.ok) throw new Error(data?.error ?? "Submission failed");

      // Best-effort: generate a poster image so the widget thumbnail isn't black.
      if (mode === "video" && mediaUrl && data?.proof_object_id && data?.business_id && token) {
        void generateVideoPoster({
          businessId: data.business_id,
          mediaUrl,
          proofId: data.proof_object_id,
          authorName: name,
          brandColor: ctx?.brand_color ?? undefined,
          collectionToken: token,
        });
      }

      navigate(`/collect/${token}/done`, {
        state: {
          photoUrl,
          authorName: name,
          mode,
          hasMedia: !!mediaUrl,
        },
      });
    } catch (err) {
      toast({ title: "Submission failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (ctxError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-semibold">Link unavailable</h1>
            <p className="text-muted-foreground mt-2">{ctxError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardContent className="pt-8">
          <div className="text-center mb-6">
            {ctx.business_logo_url && (
              <img src={ctx.business_logo_url} alt={ctx.business_name} className="h-10 mx-auto mb-3 object-contain" />
            )}
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">CUST-01</div>
            <h1 className="text-2xl font-bold mt-1">Share your experience</h1>
            <p className="text-muted-foreground mt-1 text-sm">Your testimonial helps {ctx.business_name} reach more people.</p>
            <div className="mt-2"><VideoBadgeLink audience="customer" label="How it works — 60 seconds" /></div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-6">
            <Button type="button" variant={mode === "text" ? "default" : "outline"} onClick={() => setMode("text")}><Type className="h-4 w-4 mr-2" /> Write</Button>
            <Button type="button" variant={mode === "video" ? "default" : "outline"} onClick={() => setMode("video")}><Video className="h-4 w-4 mr-2" /> Record video</Button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} inputMode="email" autoComplete="email" /></div>
            </div>
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} className="p-1" aria-label={`Rate ${n} stars`}>
                    <Star className={cn("h-7 w-7", n <= rating ? "fill-gold text-gold" : "text-muted-foreground")} />
                  </button>
                ))}
              </div>
            </div>

            {mode === "text" ? (
              <div className="space-y-2"><Label>Your testimonial</Label><Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} required minLength={10} maxLength={5000} placeholder="What did you like most?" /></div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Video</Label>
                  <div className="rounded-md border bg-muted/30 p-2">
                    {(recording || videoBlob) ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        muted={recording}
                        controls={!!videoBlob && !recording}
                        className="w-full rounded"
                      />
                    ) : (
                      <div className="aspect-video w-full rounded flex flex-col items-center justify-center bg-muted text-muted-foreground gap-2">
                        <Video className="h-10 w-10 opacity-60" />
                        <p className="text-sm">Click "Start recording" to begin</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!recording && !videoBlob && (
                      <Button type="button" variant="outline" onClick={startRecording}>
                        Start recording <span className="ml-2 text-xs opacity-70">(max {ctx.max_video_seconds}s)</span>
                      </Button>
                    )}
                    {recording && (
                      <Button type="button" variant="destructive" onClick={stopRecording}>
                        Stop <span className="ml-2 tabular-nums text-xs">{recordSecondsLeft}s left</span>
                      </Button>
                    )}
                    {videoBlob && !recording && (
                      <Button type="button" variant="ghost" onClick={() => { setVideoBlob(null); setVideoDuration(0); }}>Re-record</Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Optional caption</Label>
                  <Textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} placeholder="A short note to go with your video" />
                </div>
              </div>
            )}

            {/* Impact fields — filled by the customer for authenticity */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>What result did you achieve? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={outcomeClaim}
                  onChange={(e) => setOutcomeClaim(e.target.value)}
                  maxLength={160}
                  placeholder="e.g. Increased signups by 38%"
                />
                <p className="text-xs text-muted-foreground">A short, measurable outcome — this may be highlighted in the testimonial display.</p>
              </div>
              <div className="space-y-2">
                <Label>Key phrase to highlight <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={highlightPhrase}
                  onChange={(e) => setHighlightPhrase(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. doubled our conversions in two weeks"
                />
                <p className="text-xs text-muted-foreground">Pick the most important part of your testimonial — it'll be visually emphasized.</p>
              </div>
            </div>

            {/* Optional "About you" — collected to power the rich lightbox modal */}
            <div className="border rounded-md">
              <button
                type="button"
                onClick={() => setShowAboutYou((s) => !s)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 rounded-md"
              >
                <span>About you <span className="text-muted-foreground font-normal">(optional, helps your testimonial stand out)</span></span>
                <span className="text-muted-foreground text-lg leading-none">{showAboutYou ? "−" : "+"}</span>
              </button>
              {showAboutYou && (
                <div className="px-4 pb-4 space-y-3 border-t pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Role / position</Label><Input value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} placeholder="Head of Marketing" /></div>
                    <div className="space-y-2"><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} placeholder="Acme Inc." /></div>
                  </div>
                  <div className="space-y-2"><Label>Website (optional)</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={300} placeholder="acme.com" /></div>
                  <div className="space-y-2">
                    <Label>Your photo (optional)</Label>
                    <div className="flex items-center gap-3">
                      {photoPreview && (
                        <img src={photoPreview} alt="" className="h-14 w-14 rounded-full object-cover border" />
                      )}
                      <Input
                        type="file"
                        accept="image/*,.heic,.heif"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setPhotoFile(f);
                          if (photoPreview) URL.revokeObjectURL(photoPreview);
                          setPhotoPreview(f ? URL.createObjectURL(f) : null);
                          setPhotoUploadError(null);
                          setSkipPhoto(false);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {photoUploadError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Photo couldn't be uploaded</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p className="text-sm">
                    Your testimonial has not been submitted yet. {photoUploadError}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPhotoUploadError(null);
                        setSkipPhoto(false);
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Try uploading again
                    </Button>
                    {mode === "video" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={submitting}
                        onClick={(ev) => {
                          // Video mode only: explicit user choice to drop the
                          // photo and submit the video without it.
                          setSkipPhoto(true);
                          setPhotoUploadError(null);
                          const form = (ev.currentTarget as HTMLButtonElement).closest("form");
                          if (form) setTimeout(() => form.requestSubmit(), 0);
                        }}
                      >
                        <X className="h-3.5 w-3.5 mr-1.5" />
                        Submit video without photo
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit testimonial
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

interface CollectThanksState {
  photoUrl?: string | null;
  authorName?: string | null;
  mode?: "text" | "video";
  hasMedia?: boolean;
}

export function CollectThanks() {
  const location = useLocation();
  const state = (location.state as CollectThanksState | null) ?? {};
  const photoUrl = state.photoUrl ?? null;
  const initial = (state.authorName ?? "").trim().charAt(0).toUpperCase() || "✓";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-10 pb-10 text-center">
          {photoUrl ? (
            <div className="mx-auto mb-4 relative w-20 h-20">
              <img
                src={photoUrl}
                alt={state.authorName ?? "Your photo"}
                className="w-20 h-20 rounded-full object-cover border-2 border-success shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-success text-success-foreground flex items-center justify-center shadow">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
          ) : (
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success mb-4">
              {state.authorName ? (
                <span className="text-xl font-semibold">{initial}</span>
              ) : (
                <CheckCircle2 className="h-8 w-8" />
              )}
            </div>
          )}
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">CUST-02</div>
          <h1 className="text-2xl font-bold mt-1">Thank you!</h1>
          <p className="text-muted-foreground mt-2">Your testimonial has been received. We really appreciate it.</p>
          {photoUrl && (
            <p className="mt-3 text-xs text-success font-medium">Photo saved ✓</p>
          )}
          {state.mode === "video" && state.hasMedia && (
            <p className="mt-1 text-xs text-success font-medium">Video saved ✓</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
