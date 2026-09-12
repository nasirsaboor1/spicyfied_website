// Client-side product-photo processing, run in the admin's browser before
// upload. Chosen over a Supabase Edge Function or Supabase Storage's built-in
// image transformation because: (1) this project's Storage tier returned
// `FeatureNotEnabled` when a transform URL was requested directly against
// the live bucket, so the built-in transform isn't available without a plan
// change; (2) a 25-product catalog doesn't justify standing up and
// maintaining a server-side image pipeline (a Deno edge function + an image
// library) when the browser's own Canvas API does the same resize/re-encode
// work for free, with no new infrastructure, no new cost, and no new
// dependency. Runs once per upload, in the only browser that ever uploads
// product photos (the admin panel).

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB — generous for a phone/camera photo, rejects pathological files

// Longest-edge target per tier, derived from real rendered sizes measured
// live against the production build (see PHASE4_WAVE2_REPORT.md, "New Image
// Architecture"): product cards render at up to ~392px CSS width (2x DPR
// ~784px) and the product-detail gallery image at up to ~734px CSS width
// (2x DPR ~1468px). Each tier below comfortably covers its measured 2x need.
export const IMAGE_TIERS = {
  thumb: { suffix: '--thumb', longestEdge: 800, quality: 0.78 },
  medium: { suffix: '--medium', longestEdge: 1600, quality: 0.82 },
} as const;

export type ImageTierName = keyof typeof IMAGE_TIERS;

export interface ProcessedVariant {
  tier: ImageTierName;
  blob: Blob;
  width: number;
  height: number;
}

export interface ImageValidationError {
  code: 'invalid_type' | 'too_large';
  message: string;
}

export function validateImageFile(file: File): ImageValidationError | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { code: 'invalid_type', message: 'Please upload a JPEG, PNG, or WebP image.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { code: 'too_large', message: 'Image is too large (max 25MB). Please use a smaller file.' };
  }
  return null;
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  // `imageOrientation: 'from-image'` applies the file's EXIF orientation
  // during decode, so every downstream canvas draw is already
  // right-side-up — this is the "normalize orientation" step, and it
  // requires no EXIF-parsing library.
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}

function targetDimensions(sourceW: number, sourceH: number, longestEdge: number): { w: number; h: number } {
  const longestSource = Math.max(sourceW, sourceH);
  // Never upscale: if the source is already smaller than the tier target,
  // keep its native size.
  if (longestSource <= longestEdge) return { w: sourceW, h: sourceH };
  const scale = longestEdge / longestSource;
  return { w: Math.round(sourceW * scale), h: Math.round(sourceH * scale) };
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
      'image/webp',
      quality
    );
  });
}

// Draws the decoded bitmap onto a canvas sized for one tier and exports as
// WebP. A fresh canvas draw inherently drops EXIF/GPS/ICC metadata from the
// source file — this is the "avoid unnecessary metadata" step, also free.
async function renderTier(bitmap: ImageBitmap, longestEdge: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const { w, h } = targetDimensions(bitmap.width, bitmap.height, longestEdge);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await canvasToWebpBlob(canvas, quality);
  return { blob, width: w, height: h };
}

// Generates every tier for one source file. Tiers are independent — a
// failure on one (e.g. an unusually large canvas the browser refuses) does
// not stop the others from being produced; the caller decides how to
// proceed with a partial set (see uploadProductImage in adminProducts.ts).
export async function generateImageVariants(file: File): Promise<{ variants: ProcessedVariant[]; errors: string[] }> {
  const bitmap = await decodeImage(file);
  const variants: ProcessedVariant[] = [];
  const errors: string[] = [];

  for (const [tier, cfg] of Object.entries(IMAGE_TIERS) as [ImageTierName, typeof IMAGE_TIERS[ImageTierName]][]) {
    try {
      const { blob, width, height } = await renderTier(bitmap, cfg.longestEdge, cfg.quality);
      variants.push({ tier, blob, width, height });
    } catch (e) {
      errors.push(`${tier}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  bitmap.close();
  return { variants, errors };
}

// Derives a tier's Storage object path from the ORIGINAL object path, e.g.
// "1699999999-abc12-cinnamon.jpg" -> "1699999999-abc12-cinnamon--thumb.webp".
// Pure string manipulation, no database lookup — this is what lets existing
// product_images rows (which only ever stored the original path) gain
// resized variants with no schema change and no backfill of the database
// itself: the frontend just tries the derived path and falls back to the
// original path if the derived object doesn't exist yet (see
// resolveImageUrl in lib/products.ts).
export function deriveVariantPath(originalPath: string, tier: ImageTierName): string {
  const cleaned = originalPath.startsWith('/') ? originalPath.slice(1) : originalPath;
  const dot = cleaned.lastIndexOf('.');
  const base = dot === -1 ? cleaned : cleaned.slice(0, dot);
  return `${base}${IMAGE_TIERS[tier].suffix}.webp`;
}
