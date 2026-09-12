import { useState, useEffect, ImgHTMLAttributes } from 'react';

interface ResilientImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Preferred URL — a resized variant that may not exist in Storage yet
   * (an image uploaded before the resize pipeline existed, or a variant
   * that failed to generate at upload time). */
  src: string;
  /** A URL that is always expected to resolve (the original upload).
   * Swapped in automatically if `src` fails to load. */
  fallbackSrc: string;
}

// The one place that implements Wave 2's "optimized image if available,
// otherwise the existing original" rule (Phase E) — every product image in
// the app should render through this, not a bare <img>, so that a photo
// uploaded before this pipeline existed (or a variant that failed to
// generate) never disappears, it just falls back silently.
export default function ResilientImage({ src, fallbackSrc, alt, ...imgProps }: ResilientImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);
  const [triedFallback, setTriedFallback] = useState(false);

  // If the preferred/fallback URLs change (e.g. navigating between
  // products reuses the same mounted component), reset to the new
  // preferred source rather than getting stuck on a stale fallback.
  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setTriedFallback(false);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (!triedFallback && fallbackSrc && currentSrc !== fallbackSrc) {
      setTriedFallback(true);
      setCurrentSrc(fallbackSrc);
    }
  };

  return <img src={currentSrc} alt={alt} onError={handleError} {...imgProps} />;
}
