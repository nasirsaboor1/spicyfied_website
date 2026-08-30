interface IconProps {
  className?: string;
}

/**
 * Small stylised line icons used only for tiny UI feedback moments
 * (the "Add to Cart" particle burst) where an icon reads as a symbol,
 * not a claim about the product - like a confetti burst or checkmark.
 * Brand-level "here is the spice" statements use real product photos
 * instead (see SpiceReveal.tsx), never these.
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
