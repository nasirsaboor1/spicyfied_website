import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'motion/react';
import { SCROLL_SPICE_PHOTOS } from '../lib/spicePhotos';

/**
 * As the visitor scrolls the homepage, real product photographs -
 * not illustrations - drift downward and rotate gently, then fade out
 * just before the product sections come into view. The brand's
 * premise is authenticity, so the moving elements are actual photos
 * of what's sold, circular-cropped like a loupe view, not drawings
 * standing in for the real thing.
 *
 * Hidden under prefers-reduced-motion and on small screens (thumb-
 * scrolling mobile with ambient movement in view feels cluttered).
 */

interface PhotoProps {
  src: string;
  y: MotionValue<number>;
  rotate: MotionValue<number>;
  opacity: MotionValue<number>;
  className: string;
  size: number;
}

function DriftingPhoto({ src, y, rotate, opacity, className, size }: PhotoProps) {
  return (
    <motion.div
      style={{ y, rotate, opacity, width: size, height: size }}
      className={`absolute rounded-full overflow-hidden ring-1 ring-cream/20 shadow-2xl shadow-black/40 ${className}`}
    >
      <img src={src} alt="" className="w-full h-full object-cover" />
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

  const opacity1 = useTransform(scrollYProgress, [0.02, 0.1, 0.42, 0.55], [0, 0.95, 0.8, 0]);
  const opacity2 = useTransform(scrollYProgress, [0.05, 0.15, 0.45, 0.58], [0, 0.9, 0.75, 0]);
  const opacity3 = useTransform(scrollYProgress, [0.03, 0.12, 0.4, 0.55], [0, 0.85, 0.7, 0]);
  const opacity4 = useTransform(scrollYProgress, [0.04, 0.13, 0.44, 0.56], [0, 0.85, 0.7, 0]);

  const y1 = useTransform(scrollYProgress, [0, 0.6], [0, 900]);
  const y2 = useTransform(scrollYProgress, [0, 0.6], [0, 1100]);
  const y3 = useTransform(scrollYProgress, [0, 0.6], [0, 800]);
  const y4 = useTransform(scrollYProgress, [0, 0.6], [0, 950]);

  const rot1 = useTransform(scrollYProgress, [0, 0.6], [0, 40]);
  const rot2 = useTransform(scrollYProgress, [0, 0.6], [0, -55]);
  const rot3 = useTransform(scrollYProgress, [0, 0.6], [0, 30]);
  const rot4 = useTransform(scrollYProgress, [0, 0.6], [0, -35]);

  if (!ready) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden hidden md:block"
      aria-hidden="true"
    >
      <DriftingPhoto
        src={SCROLL_SPICE_PHOTOS.cardamom}
        y={y1}
        rotate={rot1}
        opacity={opacity1}
        size={88}
        className="top-28 left-[6%]"
      />
      <DriftingPhoto
        src={SCROLL_SPICE_PHOTOS.clove}
        y={y2}
        rotate={rot2}
        opacity={opacity2}
        size={64}
        className="top-44 right-[8%]"
      />
      <DriftingPhoto
        src={SCROLL_SPICE_PHOTOS.cinnamon}
        y={y3}
        rotate={rot3}
        opacity={opacity3}
        size={94}
        className="top-40 left-[46%]"
      />
      <DriftingPhoto
        src={SCROLL_SPICE_PHOTOS.starAnise}
        y={y4}
        rotate={rot4}
        opacity={opacity4}
        size={74}
        className="top-64 right-[28%]"
      />
    </div>
  );
}
