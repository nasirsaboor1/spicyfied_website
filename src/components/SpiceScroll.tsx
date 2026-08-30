import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'motion/react';
import { CinnamonIcon, CloveIcon, CardamomIcon } from './SpiceElements';

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
      className={`absolute text-saffron-light ${className}`}
    >
      <Icon className="w-full h-auto" />
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

  // Fade in past the initial hero (5%), hold, fade out before the
  // first product section comes into view (~55% down a typical scroll).
  const opacity1 = useTransform(scrollYProgress, [0.02, 0.1, 0.42, 0.55], [0, 0.5, 0.4, 0]);
  const opacity2 = useTransform(scrollYProgress, [0.05, 0.15, 0.45, 0.58], [0, 0.55, 0.45, 0]);
  const opacity3 = useTransform(scrollYProgress, [0.03, 0.12, 0.4, 0.55], [0, 0.45, 0.35, 0]);

  const y1 = useTransform(scrollYProgress, [0, 0.6], [0, 900]);
  const y2 = useTransform(scrollYProgress, [0, 0.6], [0, 1100]);
  const y3 = useTransform(scrollYProgress, [0, 0.6], [0, 800]);

  const rot1 = useTransform(scrollYProgress, [0, 0.6], [0, 180]);
  const rot2 = useTransform(scrollYProgress, [0, 0.6], [0, -220]);
  const rot3 = useTransform(scrollYProgress, [0, 0.6], [0, 140]);

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
        size={42}
        className="top-24 left-[7%]"
      />
      <DriftingSpice
        Icon={CloveIcon}
        y={y2}
        rotate={rot2}
        opacity={opacity2}
        size={30}
        className="top-40 right-[8%]"
      />
      <DriftingSpice
        Icon={CinnamonIcon}
        y={y3}
        rotate={rot3}
        opacity={opacity3}
        size={38}
        className="top-32 left-[43%]"
      />
    </div>
  );
}
