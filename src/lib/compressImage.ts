const MAX_DIMENSION = 1000;
const JPEG_QUALITY = 0.7;
const SKIP_IF_UNDER_BYTES = 150 * 1024;

/**
 * Resizes and re-compresses an image in the browser before upload to keep
 * storage/bandwidth small. Photos are re-encoded as JPEG (even iPhone .PNG
 * photos, which are huge and never need transparency); a PNG with genuine
 * transparency is preserved as PNG. Never upscales. Falls back to the original
 * file if the browser can't decode it.
 */
export async function compressImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));

  // A file that's already small and doesn't need downscaling isn't worth re-encoding.
  if (scale === 1 && file.size < SKIP_IF_UNDER_BYTES) {
    bitmap.close();
    return file;
  }

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Only keep PNG if the source actually uses transparency; otherwise JPEG is
  // far smaller. Sample the alpha channel on a stride for speed.
  let keepPng = false;
  if (file.type === 'image/png') {
    try {
      const { data } = ctx.getImageData(0, 0, width, height);
      for (let i = 3; i < data.length; i += 40) {
        if (data[i] < 250) {
          keepPng = true;
          break;
        }
      }
    } catch {
      keepPng = true; // couldn't inspect - stay safe and keep PNG
    }
  }

  const outputType = keepPng ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, keepPng ? undefined : JPEG_QUALITY)
  );
  if (!blob) return file;

  // If re-encoding somehow produced a bigger file than the original, keep the original.
  if (blob.size >= file.size && scale === 1) return file;

  const newName = keepPng ? file.name : file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], newName, { type: outputType });
}
