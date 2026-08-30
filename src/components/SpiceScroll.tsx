import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'motion/react';
import { CinnamonIcon, CloveIcon, CardamomIcon, StarAniseIcon } from './SpiceElements';

/**
 * As the visitor scrolls the homepage, a small cluster of spice icons
 * drifts downward and rotates - as if you're descending through the
 * jar as you read - then fades out just before the product sections,
 * so the illustration "arrives" at the same place the reader does.
 * Hidden under prefers-reduced-motion and on small screens (thumb-
 * scrolling on mobile with ambient movement in view feels cluttered).
 */

interface SpiceProps {
  Icon: typeof CinnamonIcon;
  y: MotionValue<number>;
  rotate: MotionValue<number>;
  opacity: MotionValue<number>;
  className: string;
  size: number;
}

function DriftingSpice({ Icon, y, rotate, opacity, className, size }: SpiceProps) {
  return (
    <motion.div
      style={{ y, rotate, opacity, width: size }}
      className={`absolute ${className}`}
    >
      <Icon className="w-full h-auto drop-shadow-lg" />
    </motion.div>
  );
}

export default function SpiceScroll() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReady(!reduced);
  }, []);

  const { scrollYProgress } = useScroll();

  // Fade in past the initial hero, hold, fade out before the
  // first product section comes into view.
  const opacity1 = useTransform(scrollYProgress, [0.02, 0.1, 0.42, 0.55], [0, 0.9, 0.75, 0]);
  const opacity2 = useTransform(scrollYProgress, [0.05, 0.15, 0.45, 0.58], [0, 0.85, 0.7, 0]);
  const opacity3 = useTransform(scrollYProgress, [0.03, 0.12, 0.4, 0.55], [0, 0.8, 0.65, 0]);
  const opacity4 = useTransform(scrollYProgress, [0.04, 0.13, 0.44, 0.56], [0, 0.8, 0.65, 0]);

  const y1 = useTransform(scrollYProgress, [0, 0.6], [0, 900]);
  const y2 = useTransform(scrollYProgress, [0, 0.6], [0, 1100]);
  const y3 = useTransform(scrollYProgress, [0, 0.6], [0, 800]);
  const y4 = useTransform(scrollYProgress, [0, 0.6], [0, 950]);

  const rot1 = useTransform(scrollYProgress, [0, 0.6], [0, 180]);
  const rot2 = useTransform(scrollYProgress, [0, 0.6], [0, -220]);
  const rot3 = useTransform(scrollYProgress, [0, 0.6], [0, 140]);
  const rot4 = useTransform(scrollYProgress, [0, 0.6], [0, -160]);

  if (!ready) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden hidden md:block"
      aria-hidden="true"
    >
      <DriftingSpice
        Icon={CardamomIcon}
        y={y1}
        rotate={rot1}
        opacity={opacity1}
        size={72}
        className="top-28 left-[6%]"
      />
      <DriftingSpice
        Icon={CloveIcon}
        y={y2}
        rotate={rot2}
        opacity={opacity2}
        size={54}
        className="top-44 right-[8%]"
      />
      <DriftingSpice
        Icon={CinnamonIcon}
        y={y3}
        rotate={rot3}
        opacity={opacity3}
        size={78}
        className="top-40 left-[46%]"
      />
      <DriftingSpice
        Icon={StarAniseIcon}
        y={y4}
        rotate={rot4}
        opacity={opacity4}
        size={62}
        className="top-64 right-[28%]"
      />
    </div>
  );
}
