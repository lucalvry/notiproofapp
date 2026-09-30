// Browser-side photo normalizer.
//
// Why this exists: iPhones save photos as HEIC and at 4–8 MB, which the
// previous Collect form rejected outright ("Unsupported photo" / "Photo too
// large"). Media is critical to the proof system, so we always try to
// salvage the photo client-side: decode it, downscale the long edge to
// MAX_EDGE px, and re-encode as JPEG @ quality 0.85. This:
//   • turns HEIC into JPEG (when the browser can decode it — Safari can,
//     Chrome cannot, and we degrade gracefully with a clear error),
//   • strips EXIF, removing GPS PII,
//   • brings every phone photo well under the 5 MB ceiling.
//
// Returns a fresh File with a `.jpg` name and `image/jpeg` MIME type.

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;
const HARD_CEILING_BYTES = 5 * 1024 * 1024; // post-resize sanity cap

function isHeicLike(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (t === "image/heic" || t === "image/heif") return true;
  // Safari sometimes reports an empty type for HEIC — sniff the extension.
  if (!t) {
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    return ext === "heic" || ext === "heif";
  }
  return false;
}

async function decodeToBitmap(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }>
{
  // Prefer createImageBitmap — fast, off-thread on modern browsers, and
  // honors EXIF orientation when imageOrientation: "from-image" is set.
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return {
        width: bmp.width,
        height: bmp.height,
        draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h),
      };
    } catch {
      // Fall through to <img> fallback.
    }
  }
  // Fallback: HTMLImageElement via object URL.
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode_failed"));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    };
  } finally {
    // Revoke after a tick so the canvas draw above can complete.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export interface NormalizedPhoto {
  file: File;
  width: number;
  height: number;
  originalBytes: number;
  finalBytes: number;
  wasResized: boolean;
  wasReencoded: boolean;
}

export async function normalizePhoto(file: File): Promise<NormalizedPhoto> {
  const originalBytes = file.size;
  let decoded;
  try {
    decoded = await decodeToBitmap(file);
  } catch (e) {
    // The browser couldn't decode the image (typical for HEIC on Chrome/
    // Android). Throw a precise error so the UI can tell the user exactly
    // what to do instead of a generic "upload failed".
    if (isHeicLike(file)) {
      throw new Error(
        "Your phone saved this photo as HEIC, which this browser can't read. Please choose a JPEG or PNG, or change your iPhone camera setting to 'Most Compatible'.",
      );
    }
    throw new Error("We couldn't read this image. Please try a different photo.");
  }

  const longEdge = Math.max(decoded.width, decoded.height);
  const scale = longEdge > MAX_EDGE ? MAX_EDGE / longEdge : 1;
  const targetW = Math.round(decoded.width * scale);
  const targetH = Math.round(decoded.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images. Please try a different browser.");
  // White background — JPEG has no alpha, and transparent PNGs would
  // otherwise turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  decoded.draw(ctx, targetW, targetH);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("We couldn't process this photo. Please try a different image.");
  if (blob.size > HARD_CEILING_BYTES) {
    throw new Error("This photo is too large even after compression. Please choose a smaller image.");
  }

  const baseName = (file.name || "photo").replace(/\.[^.]+$/, "");
  const safeBase = baseName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "photo";
  const out = new File([blob], `${safeBase}.jpg`, { type: "image/jpeg", lastModified: Date.now() });

  return {
    file: out,
    width: targetW,
    height: targetH,
    originalBytes,
    finalBytes: out.size,
    wasResized: scale < 1,
    wasReencoded: true,
  };
}
