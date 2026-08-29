import { useEffect, useState } from 'react';
import { CinnamonIcon, CloveIcon, CardamomIcon } from './SpiceElements';

const ICONS = [CinnamonIcon, CloveIcon, CardamomIcon, CloveIcon, CardamomIcon, CinnamonIcon];

interface Particle {
  Icon: typeof CinnamonIcon;
  dx: number;
  dy: number;
  rot: number;
  size: number;
  delay: number;
}

function makeParticles(): Particle[] {
  return ICONS.map((Icon, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const distance = 44 + Math.random() * 26;
    return {
      Icon,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance - 16,
      rot: (Math.random() - 0.5) * 220,
      size: 13 + Math.random() * 7,
      delay: i * 22,
    };
  });
}

interface SpicePuffProps {
  /** Increment this number to fire a new burst. 0 renders nothing. */
  triggerKey: number;
}

/**
 * A one-shot burst of the hand-drawn spice icons, thrown outward from
 * center and faded. Meant for a single meaningful moment (e.g. "Added
 * to cart"), not ambient decoration - fires once per triggerKey change.
 */
export default function SpicePuff({ triggerKey }: SpicePuffProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (triggerKey === 0) return;
    setParticles(makeParticles());
    const timeout = setTimeout(() => setParticles([]), 750);
    return () => clearTimeout(timeout);
  }, [triggerKey]);

  if (particles.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-visible motion-reduce:hidden"
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <div
          key={`${triggerKey}-${i}`}
          className="absolute left-1/2 top-1/2 text-saffron-light animate-spice-puff"
          style={
            {
              width: p.size,
              animationDelay: `${p.delay}ms`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--rot': `${p.rot}deg`,
            } as React.CSSProperties
          }
        >
          <p.Icon className="w-full h-auto" />
        </div>
      ))}
    </div>
  );
}
