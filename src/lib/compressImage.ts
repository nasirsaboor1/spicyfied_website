const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.72;

/**
 * Resizes an image file in the browser before upload. PNGs are kept as PNG
 * (so any transparency survives) and only downscaled; everything else is
 * re-encoded as JPEG at a fixed quality. Never upscales - a smaller source
 * image is returned untouched. Falls back to the original file if the
 * browser can't decode it (e.g. an unsupported format).
 */
export async function compressImage(file: File): Promise<File> {
  const isPng = file.type === 'image/png';

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  if (scale === 1 && !isPng) {
    bitmap.close();
    return file;
  }

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

  const outputType = isPng ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, isPng ? undefined : JPEG_QUALITY)
  );
  if (!blob) return file;

  const newName = isPng ? file.name : file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], newName, { type: outputType });
}
