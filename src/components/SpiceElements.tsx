interface IconProps {
  className?: string;
}

/**
 * Coloured, illustrative SVGs of common spices — designed to be
 * recognisable at small sizes on both the dark hero background and
 * the cream body sections. Each uses fills in real spice colours
 * (sage-green cardamom, dark-brown clove, warm-brown cinnamon,
 * near-black peppercorn, deep-brown star anise) rather than outline
 * strokes, so they read as objects, not diagrams.
 */

export function CinnamonIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 44 100" fill="none" className={className} aria-hidden="true">
      {/* rolled bark cylinder */}
      <path
        d="M14 8 Q10 12 10 22 L10 82 Q10 92 14 96 L30 96 Q34 92 34 82 L34 22 Q34 12 30 8 Z"
        fill="#8B5A2B"
      />
      {/* shaded side */}
      <path
        d="M22 8 Q18 12 18 22 L18 82 Q18 92 22 96 L30 96 Q34 92 34 82 L34 22 Q34 12 30 8 Z"
        fill="#6F4520"
      />
      {/* top rolled edge (concentric spiral) */}
      <ellipse cx="22" cy="10" rx="12" ry="4" fill="#A0693A" />
      <ellipse cx="22" cy="10" rx="8" ry="2.5" fill="#6F4520" />
      <ellipse cx="22" cy="10" rx="4" ry="1.2" fill="#4A2E15" />
      {/* bottom rolled edge */}
      <ellipse cx="22" cy="94" rx="12" ry="4" fill="#6F4520" />
      <ellipse cx="22" cy="94" rx="8" ry="2.5" fill="#4A2E15" />
      {/* bark texture — thin longitudinal lines */}
      <path d="M14 22 Q12 50 14 82" stroke="#6F4520" strokeWidth="0.6" fill="none" opacity="0.6" />
      <path d="M30 22 Q32 50 30 82" stroke="#4A2E15" strokeWidth="0.6" fill="none" opacity="0.6" />
    </svg>
  );
}

export function CloveIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 30 60" fill="none" className={className} aria-hidden="true">
      {/* unopened flower ball on top */}
      <circle cx="15" cy="7" r="4.5" fill="#3E2410" />
      <circle cx="13.5" cy="6" r="1.2" fill="#5C3820" opacity="0.7" />
      {/* 4-lobed calyx — the "petals" spreading below the bud */}
      <path d="M15 10 L7 14 L15 18 L23 14 Z" fill="#5C3820" />
      <path d="M15 10 L15 18" stroke="#3E2410" strokeWidth="0.6" opacity="0.6" />
      <path d="M7 14 L23 14" stroke="#3E2410" strokeWidth="0.6" opacity="0.6" />
      {/* long tapering stem — nail-shaped */}
      <path d="M12 18 L11 55 Q15 58 19 55 L18 18 Z" fill="#6F3A19" />
      {/* highlight down center for form */}
      <path d="M15 20 L15 54" stroke="#8A4820" strokeWidth="0.7" opacity="0.7" />
      {/* shaded side */}
      <path d="M15 18 L18 18 L19 55 Q17 57 15 57 Z" fill="#4A2510" opacity="0.5" />
    </svg>
  );
}

export function CardamomIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 40 60" fill="none" className={className} aria-hidden="true">
      {/* pointed top "beak" */}
      <path d="M20 2 L14 10 L26 10 Z" fill="#7C9668" />
      {/* main pod body — pale sage green */}
      <ellipse cx="20" cy="34" rx="13" ry="24" fill="#A3B78A" />
      {/* darker shaded half for form */}
      <path
        d="M20 10 Q10 22 10 34 Q10 48 20 58 Q22 48 22 34 Q22 22 20 10 Z"
        fill="#8FA675"
        opacity="0.55"
      />
      {/* three vertical ridges */}
      <path d="M20 12 L20 56" stroke="#5F7B48" strokeWidth="0.7" opacity="0.65" />
      <path d="M14 14 Q11 34 14 54" stroke="#5F7B48" strokeWidth="0.5" fill="none" opacity="0.5" />
      <path d="M26 14 Q29 34 26 54" stroke="#5F7B48" strokeWidth="0.5" fill="none" opacity="0.5" />
      {/* outline for definition */}
      <path
        d="M20 4 L14 10 Q7 22 7 34 Q7 50 20 60 Q33 50 33 34 Q33 22 26 10 L20 4 Z"
        fill="none"
        stroke="#5F7B48"
        strokeWidth="0.8"
        opacity="0.7"
      />
      {/* small base flare */}
      <ellipse cx="20" cy="58" rx="6" ry="1.5" fill="#5F7B48" opacity="0.6" />
    </svg>
  );
}

export function StarAniseIcon({ className = '' }: IconProps) {
  // 8-pointed star with seed at each tip
  const points = [];
  const cx = 25;
  const cy = 25;
  const outer = 22;
  const inner = 7;
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    points.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
  }
  return (
    <svg viewBox="0 0 50 50" fill="none" className={className} aria-hidden="true">
      <polygon points={points.join(' ')} fill="#6B3A1C" />
      <polygon points={points.join(' ')} fill="#4A2612" opacity="0.4" />
      {/* seed pods — small ovals at each of 8 tips */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (Math.PI / 4) * i - Math.PI / 2;
        const px = cx + Math.cos(a) * (outer - 6);
        const py = cy + Math.sin(a) * (outer - 6);
        return <ellipse key={i} cx={px} cy={py} rx="3" ry="2" fill="#C4915A" />;
      })}
      {/* center */}
      <circle cx={cx} cy={cy} r="3" fill="#3E2010" />
    </svg>
  );
}

interface FloatingSpice {
  Icon: (props: IconProps) => JSX.Element;
  top: string;
  left?: string;
  right?: string;
  size: number;
  rotate: number;
  duration: number;
  delay: number;
  opacity: number;
}

const SPICES: FloatingSpice[] = [
  { Icon: CinnamonIcon, top: '12%', left: '8%', size: 54, rotate: -18, duration: 11, delay: 0, opacity: 0.55 },
  { Icon: CardamomIcon, top: '62%', left: '6%', size: 50, rotate: 8, duration: 9, delay: 1.2, opacity: 0.6 },
  { Icon: CloveIcon, top: '20%', right: '9%', size: 40, rotate: 14, duration: 10, delay: 0.6, opacity: 0.6 },
  { Icon: StarAniseIcon, top: '66%', right: '7%', size: 46, rotate: -10, duration: 12, delay: 2, opacity: 0.5 },
  { Icon: CardamomIcon, top: '4%', right: '22%', size: 36, rotate: 24, duration: 13, delay: 0.9, opacity: 0.45 },
];

export default function SpiceOrbit() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {SPICES.map(({ Icon, top, left, right, size, rotate, duration, delay, opacity }, i) => (
        <div
          key={i}
          className="motion-safe:animate-spice-float absolute"
          style={
            {
              top,
              left,
              right,
              width: size,
              opacity,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              '--rot-a': `${rotate}deg`,
              '--rot-b': `${rotate + 10}deg`,
            } as React.CSSProperties
          }
        >
          <Icon className="w-full h-auto" />
        </div>
      ))}
    </div>
  );
}
