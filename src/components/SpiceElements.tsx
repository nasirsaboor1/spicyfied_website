import { SCROLL_SPICE_PHOTOS } from '../lib/spicePhotos';

interface IconProps {
  className?: string;
}

/**
 * Small stylised line icons used only for tiny UI feedback moments
 * (the "Add to Cart" particle burst) where an icon reads as a symbol,
 * not a claim about the product - like a confetti burst or checkmark.
 * The hero/scroll ambient decoration below uses real product photos
 * instead; these are not used for brand-level "here is the spice"
 * statements.
 */

export function CinnamonIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 40 90" fill="none" className={className} aria-hidden="true">
      <rect x="8" y="6" width="24" height="78" rx="12" stroke="currentColor" strokeWidth="1.4" />
      <ellipse cx="20" cy="10" rx="10" ry="4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 30 Q20 35 32 30" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <path d="M8 50 Q20 55 32 50" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <path d="M8 70 Q20 75 32 70" stroke="currentColor" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

export function CloveIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 30 52" fill="none" className={className} aria-hidden="true">
      <circle cx="15" cy="13" r="8" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M15 4 L15 -1 M8 8 L3 4 M22 8 L27 4 M8 18 L3 22 M22 18 L27 22"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line x1="15" y1="21" x2="15" y2="49" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CardamomIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 52 34" fill="none" className={className} aria-hidden="true">
      <ellipse cx="26" cy="17" rx="23" ry="15" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M26 3 L26 31 M15 5 L15 29 M37 5 L37 29"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
    </svg>
  );
}

interface FloatingPhoto {
  src: string;
  top: string;
  left?: string;
  right?: string;
  size: number;
  rotate: number;
  duration: number;
  delay: number;
  opacity: number;
}

const PHOTOS: FloatingPhoto[] = [
  { src: SCROLL_SPICE_PHOTOS.cinnamon, top: '12%', left: '8%', size: 64, rotate: -8, duration: 11, delay: 0, opacity: 0.85 },
  { src: SCROLL_SPICE_PHOTOS.cardamom, top: '62%', left: '6%', size: 58, rotate: 5, duration: 9, delay: 1.2, opacity: 0.9 },
  { src: SCROLL_SPICE_PHOTOS.clove, top: '20%', right: '9%', size: 50, rotate: 6, duration: 10, delay: 0.6, opacity: 0.85 },
  { src: SCROLL_SPICE_PHOTOS.starAnise, top: '66%', right: '7%', size: 56, rotate: -5, duration: 12, delay: 2, opacity: 0.8 },
];

/**
 * Ambient floating real product photography in the hero background -
 * gentle up/down drift, no rotation-flip gimmicks. Circular-cropped
 * with a soft shadow, same treatment as the scroll animation, so the
 * hero and the rest of the page speak the same visual language.
 */
export default function SpiceOrbit() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {PHOTOS.map(({ src, top, left, right, size, rotate, duration, delay, opacity }, i) => (
        <div
          key={i}
          className="motion-safe:animate-spice-float absolute rounded-full overflow-hidden ring-1 ring-cream/20 shadow-xl shadow-black/30"
          style={
            {
              top,
              left,
              right,
              width: size,
              height: size,
              opacity,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              '--rot-a': `${rotate}deg`,
              '--rot-b': `${rotate + 4}deg`,
            } as React.CSSProperties
          }
        >
          <img src={src} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}
